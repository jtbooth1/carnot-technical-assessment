import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../db'
import { startResearchForTopicId, checkAndFinalizeResearchForTopic, startFollowupResearch } from '../research'

export const companiesRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      areasOfInterest: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create a topic of type "company"
      const company = await db.topic.create({
        data: {
          name: input.name,
          type: 'company',
          areasOfInterest: input.areasOfInterest,
          organizationId: ctx.user.organizationId,
          userId: ctx.user.userId,
          private: false, // Companies are org-wide by default
        }
      })

      // Enqueue initial research task (PENDING)
      await db.researchTask.create({
        data: {
          topicId: company.id,
          status: 'PENDING',
        }
      })

      // Fire-and-forget start (respecting org concurrency in helper). Do not await.
      void startResearchForTopicId(company.id, ctx.user.organizationId)
      
      return { 
        success: true, 
        company: {
          id: company.id,
          name: company.name,
          type: company.type,
          areasOfInterest: company.areasOfInterest,
          private: company.private,
          createdAt: company.createdAt,
        }
      }
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      // Get all companies (topics of type "company") for the user's organization
      // Include both private topics owned by the user and non-private org topics
      const companies = await db.topic.findMany({
        where: {
          type: 'company',
          organizationId: ctx.user.organizationId,
          OR: [
            { private: false }, // Org-wide companies
            { userId: ctx.user.userId, private: true } // User's private companies
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            }
          },
          researchTasks: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1, // Just the most recent task
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return companies
    }),

  delete: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Ensure topic exists and belongs to org
      const topic = await db.topic.findFirst({
        where: {
          id: input.id,
          type: 'company',
          organizationId: ctx.user.organizationId,
        },
        select: { id: true }
      })

      if (!topic) {
        throw new Error('Company not found')
      }

      // Delete topic; cascades will remove related research entities
      await db.topic.delete({ where: { id: topic.id } })

      return { success: true }
    }),

  startResearch: protectedProcedure
    .input(z.object({
      id: z.string(), // topic/company id
    }))
    .mutation(async ({ input, ctx }) => {
      // Ensure topic belongs to org and is a company
      const topic = await db.topic.findFirst({
        where: {
          id: input.id,
          type: 'company',
          organizationId: ctx.user.organizationId,
        },
        select: { id: true }
      })

      if (!topic) {
        throw new Error('Company not found')
      }

      // Ensure a PENDING task exists so UI can reflect queueing if concurrency is saturated
      const existingPending = await db.researchTask.findFirst({
        where: { topicId: topic.id, status: 'PENDING' }
      })
      if (!existingPending) {
        await db.researchTask.create({ data: { topicId: topic.id, status: 'PENDING' } })
      }

      // Fire-and-forget; helper enforces ≤2 PROCESSING per org
      void startResearchForTopicId(topic.id, ctx.user.organizationId)

      return { success: true }
    }),

  get: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const company = await db.topic.findFirst({
        where: {
          id: input.id,
          type: 'company',
          organizationId: ctx.user.organizationId,
          OR: [
            { private: false },
            { userId: ctx.user.userId, private: true }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            }
          },
          researchTasks: {
            include: {
              query: true,
              result: {
                select: {
                  id: true,
                  text: true,
                  createdAt: true,
                  links: true,
                  followups: true,
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      })

      if (!company) {
        throw new Error('Company not found')
      }

      return company
    }),

  checkStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Ensure topic belongs to org and is a company
      const topic = await db.topic.findFirst({
        where: {
          id: input.id,
          type: 'company',
          organizationId: ctx.user.organizationId,
        },
        select: { id: true }
      })

      if (!topic) {
        throw new Error('Company not found')
      }

      const result = await checkAndFinalizeResearchForTopic(topic.id, ctx.user.organizationId)
      return result
    }),

  resetResearch: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Ensure topic belongs to org and is a company
      const topic = await db.topic.findFirst({
        where: {
          id: input.id,
          type: 'company',
          organizationId: ctx.user.organizationId,
        },
        select: { id: true }
      })

      if (!topic) {
        throw new Error('Company not found')
      }

      // Find the most recent completed or failed task
      const task = await db.researchTask.findFirst({
        where: {
          topicId: topic.id,
          status: { in: ['COMPLETED', 'FAILED'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, backgroundId: true }
      })

      if (!task) {
        throw new Error('No completed research task found to reset')
      }

      await db.$transaction(async (tx) => {
        // Delete the result (cascade will delete links)
        await tx.researchResult.deleteMany({
          where: { taskId: task.id }
        })

        // Reset task to PROCESSING state (right before we got the response)
        await tx.researchTask.update({
          where: { id: task.id },
          data: {
            status: 'PROCESSING',
            completedAt: null,
            error: null,
          }
        })
      })

      return { success: true }
    }),

  digDeeper: protectedProcedure
    .input(z.object({
      followupId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fire-and-forget; helper enforces ≤2 PROCESSING per org and checks authorization
      void startFollowupResearch(input.followupId, ctx.user.organizationId)

      return { success: true }
    }),
})

