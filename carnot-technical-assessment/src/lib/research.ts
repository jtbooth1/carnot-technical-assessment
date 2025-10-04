import OpenAI from 'openai'
import { db } from './db'

const OPENAI_MODEL = process.env.RESEARCH_MODEL || 'o4-mini'
const RESEARCH_TIMEOUT_MS = Number(process.env.RESEARCH_TIMEOUT_MS || 60000)

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
    `8) Sources\n\n` +
    `Guidelines:\n` +
    `- Prefer credible sources. Avoid speculation.\n` +
    `- Cite sources as markdown links in “Sources”.\n` +
    `- Keep it readable; no fluff.\n` +
    `- If information is uncertain, say so.`
  )
}

async function enqueueDeepResearchBackground(prompt: string): Promise<{ id: string }> {
    const resp = await openai.responses.create({
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

    // Kick off background research job with OpenAI; we'll poll later
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

      await db.$transaction(async (tx) => {
        await tx.researchTask.update({
          where: { id: task.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        })

        await tx.researchResult.create({
          data: {
            taskId: task.id,
            text: outputText || 'No output returned',
            rawJson: JSON.stringify(resp)
          }
        })
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

