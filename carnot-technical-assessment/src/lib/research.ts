import OpenAI from 'openai'
import { db } from './db'

const OPENAI_MODEL = process.env.RESEARCH_MODEL || 'o4-mini-deep-research'
const CHAT_MODEL = process.env.CHAT_MODEL || 'gpt-4o-mini'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function buildPrompt(companyName: string, areasOfInterest?: string | null): string {
  const areasBlock = areasOfInterest && areasOfInterest.trim().length > 0
    ? `\n\nAreas of interest (use verbatim, do not paraphrase):\n${areasOfInterest}`
    : ''

  return (
    `You are a careful, thorough research assistant. Research the company: "${companyName}".` +
    areasBlock +
    `\n\nDeliver a concise, factual report with sections:\n` +
    `1) Overview\n` +
    `2) Products/Services\n` +
    `3) Market and Customers\n` +
    `4) Competitive Landscape\n` +
    `5) Business Model and Moat\n` +
    `6) Risks/Constraints\n` +
    `7) Noteworthy Recent Developments (last 12–18 months)\n` +
    `Guidelines:\n` +
    `- Prefer credible sources. Avoid speculation.\n` +
    `- Include sources inline as markdown links.\n` +
    `- Keep it readable; no fluff.\n` +
    `- We are operating in a low rate limit environment. Limit your tool calls and web searches.\n` +
    `- If information is uncertain, say so.` +
    `- You may add or remove sections based on the user's areas of interest or any outstanding or surprising information you find.`
  )
}

type Followup = {
  topic: string
  detail: string
}

function buildGenerateFollowupIdeasPrompt(response: string): string {
  return (
    `You are a careful, thorough research assistant. You previously produced the following report:\n\n${response}\n\n` +
    `Your task is now to generate proposals for further research to extend the report in different directions.\n\n` +
    `Your response should be in the format: { "followups": [{"topic": "products", "detail": "what are the products and services the company offers?"}]}` +
    `You must only respond in json format. Do not include any other text. The topic and detail will be displayed to the user AND used to generate a new research task.` +
    `- Prefer credible sources. Avoid speculation.\n` +
    `- Include sources inline as markdown links.\n` +
    `- Keep it readable; no fluff.\n` +
    `- We are operating in a low rate limit environment. Limit your tool calls and web searches.\n` +
    `- If information is uncertain, say so.`
  )
}

function buildFollowupPrompt(response: string, followup: Followup): string {
  return (
    `You are a careful, thorough research assistant. You previously produced the following report:\n\n${response}\n\n` +
    `Your task is now to generate a report based on the following followup:\n\n${followup.topic}\n\n${followup.detail}\n\n` +
    `- Prefer credible sources. Avoid speculation.\n` +
    `- Include sources inline as markdown links.\n` +
    `- Keep it readable; no fluff.\n` +
    `- We are operating in a low rate limit environment. Limit your tool calls and web searches.\n` +
    `- If information is uncertain, say so.`
  )
}

function extractAnnotationsFromResponse(resp: any): Array<{
  url: string
  title: string
  startIndex: number
  endIndex: number
}> {
  const annotations: Array<{
    url: string
    title: string
    startIndex: number
    endIndex: number
  }> = []

  try {
    const output = resp.output || []
    for (const item of output) {
      if (item.type === 'message' && item.content) {
        for (const contentItem of item.content) {
          if (contentItem.type === 'output_text' && contentItem.annotations) {
            for (const ann of contentItem.annotations) {
              if (ann.type === 'url_citation' && ann.url && ann.title) {
                annotations.push({
                  url: ann.url,
                  title: ann.title,
                  startIndex: ann.start_index ?? 0,
                  endIndex: ann.end_index ?? 0,
                })
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error extracting annotations:', err)
  }

  return annotations
}

async function generateFollowupsWithChatModel(outputText: string): Promise<Followup[]> {
  try {
    const prompt = buildGenerateFollowupIdeasPrompt(outputText)
    
    const response = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })
    console.log('Chat model response:', JSON.stringify(response.choices[0]?.message, null, 2))

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.warn('No content in chat model response')
      return []
    }

    // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
    let jsonContent = content.trim()
    const codeBlockMatch = jsonContent.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/m)
    if (codeBlockMatch) {
      jsonContent = codeBlockMatch[1].trim()
    }

    // Try to parse as JSON
    const parsed = JSON.parse(jsonContent)

    // Validate format
    if (!parsed || typeof parsed !== 'object') {
      console.warn('Invalid followup response: not an object')
      return []
    }

    if (!Array.isArray(parsed.followups)) {
      console.warn('Invalid followup response: followups is not an array')
      return []
    }

    // Validate each followup has topic and detail
    const validFollowups: Followup[] = []
    for (const item of parsed.followups) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.topic === 'string' &&
        typeof item.detail === 'string' &&
        item.topic.trim().length > 0 &&
        item.detail.trim().length > 0
      ) {
        validFollowups.push({
          topic: item.topic.trim(),
          detail: item.detail.trim()
        })
      }
    }

    return validFollowups
  } catch (err) {
    console.error('Error generating followups:', err)
    return []
  }
}

async function enqueueDeepResearchBackground(prompt: string): Promise<{ id: string }> {
    const resp = await openai.responses.create({
      max_output_tokens: 10000,
      model: OPENAI_MODEL,
      input: prompt,
      background: true,
      tools: [
        { type: 'web_search' }
      ]
    })

    const anyResp: any = resp
    const id: string = anyResp.id || ''
    return { id }
}

export async function startFollowupResearch(followupId: string, organizationId: string): Promise<void> {
  try {
    // Get the followup and related data
    const followup = await db.followup.findUnique({
      where: { id: followupId },
      include: {
        result: {
          include: {
            task: {
              include: {
                topic: true
              }
            }
          }
        }
      }
    })

    if (!followup) {
      throw new Error('Followup not found')
    }

    const topic = followup.result.task.topic
    if (topic.organizationId !== organizationId) {
      throw new Error('Unauthorized')
    }

    // Enforce max 2 tasks PROCESSING per org
    const inProcessCount = await db.researchTask.count({
      where: {
        status: 'PROCESSING',
        topic: { organizationId },
      }
    })

    if (inProcessCount >= 2) {
      return
    }

    // Create a new research task for this topic
    const task = await db.researchTask.create({
      data: {
        topicId: topic.id,
        status: 'PROCESSING',
        startedAt: new Date(),
      }
    })

    // Build the followup prompt using the original research text
    const prompt = buildFollowupPrompt(followup.result.text, {
      topic: followup.topic,
      detail: followup.detail
    })

    // Persist query
    await db.researchQuery.create({
      data: {
        taskId: task.id,
        prompt,
      }
    })

    const bg = await enqueueDeepResearchBackground(prompt)

    // Store background job id
    await db.researchTask.update({
      where: { id: task.id },
      data: { backgroundId: bg.id },
    })

  } catch (err) {
    console.error('Followup research error:', err)
    throw err
  }
}

export async function startResearchForTopicId(topicId: string, organizationId: string): Promise<void> {
  try {
    // Enforce max 2 tasks PROCESSING per org
    const inProcessCount = await db.researchTask.count({
      where: {
        status: 'PROCESSING',
        topic: { organizationId },
      }
    })

    if (inProcessCount >= 2) {
      return
    }

    // Find a PENDING task for this topic (create if missing)
    let task = await db.researchTask.findFirst({
      where: {
        topicId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!task) {
      task = await db.researchTask.create({
        data: {
          topicId,
          status: 'PENDING',
        }
      })
    }

    // Transition to PROCESSING
    task = await db.researchTask.update({
      where: { id: task.id },
      data: { status: 'PROCESSING', startedAt: new Date() },
    })

    // Fetch topic context
    const topic = await db.topic.findUnique({
      where: { id: topicId },
      select: { name: true, areasOfInterest: true },
    })

    if (!topic) {
      // Should not happen, but mark failed
      await db.researchTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', completedAt: new Date(), error: 'Topic not found' },
      })
      return
    }

    const prompt = buildPrompt(topic.name, topic.areasOfInterest)

    // Persist query first
    const query = await db.researchQuery.create({
      data: {
        taskId: task.id,
        prompt,
      }
    })

    const bg = await enqueueDeepResearchBackground(prompt)

    // Store background job id on the task for polling
    await db.researchTask.update({
      where: { id: task.id },
      data: { backgroundId: bg.id },
    })

    // Leave task in PROCESSING; a separate poller will complete it later
  } catch (err) {
    // Best-effort logging; avoid surfacing to users
    console.error('Deep research error:', err)
    // If we know task id, try to mark failed
    try {
      const message = err instanceof Error ? err.message : 'Unknown error'
      // We cannot easily tie to a task here without scope; ignore.
    } catch {}
  }
}


export async function checkAndFinalizeResearchForTopic(topicId: string, organizationId: string): Promise<{ status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED', updated: boolean }> {
  // Ensure the topic belongs to this org
  const topic = await db.topic.findFirst({
    where: { id: topicId, organizationId },
    select: { id: true }
  })

  if (!topic) {
    throw new Error('Topic not found')
  }

  // Find the most recent non-terminal task
  const task = await db.researchTask.findFirst({
    where: {
      topicId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, backgroundId: true }
  })

  if (!task) {
    // Nothing to do; treat as completed from a checking perspective
    return { status: 'COMPLETED', updated: false }
  }

  // If we don't yet have a background id, we can't poll; return current status
  if (!task.backgroundId) {
    return { status: task.status as any, updated: false }
  }

  try {
    const resp: any = await openai.responses.retrieve(task.backgroundId)

    const status: string = (resp && resp.status) || 'PROCESSING'

    if (status === 'completed') {
      const outputText: string = (resp as any).output_text ?? ''

      // Extract URL citations from annotations
      const annotations = extractAnnotationsFromResponse(resp)

      // Generate followups using chat model (inline during request)
      const followups = await generateFollowupsWithChatModel(outputText)

      await db.$transaction(async (tx) => {
        await tx.researchTask.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        })

        const result = await tx.researchResult.create({
          data: {
            taskId: task.id,
            text: outputText || 'No output returned',
            rawJson: JSON.stringify(resp)
          }
        })

        // Create Link records for each annotation
        if (annotations.length > 0) {
          await tx.link.createMany({
            data: annotations.map(ann => ({
              resultId: result.id,
              url: ann.url,
              title: ann.title,
              startIndex: ann.startIndex,
              endIndex: ann.endIndex,
            }))
          })
        }

        // Create Followup records
        if (followups.length > 0) {
          await tx.followup.createMany({
            data: followups.map(f => ({
              resultId: result.id,
              topic: f.topic,
              detail: f.detail,
            }))
          })
        }
      })

      return { status: 'COMPLETED', updated: true }
    }

    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      // Log full OpenAI response for diagnostics
      try {
        console.error('Background research job failed', {
          topicId,
          taskId: task.id,
          backgroundId: task.backgroundId,
          status,
          openaiResponse: resp,
        })
      } catch {}
      await db.researchTask.update({
        where: { id: task.id },
        data: { status: 'FAILED', completedAt: new Date(), error: `Background job ${status}` }
      })
      return { status: 'FAILED', updated: true }
    }

    // still running or queued
    return { status: task.status as any, updated: false }
  } catch (err) {
    // Swallow polling errors; surface as no-op so UI can retry
    console.error('checkAndFinalizeResearchForTopic error:', err)
    return { status: task.status as any, updated: false }
  }
}

