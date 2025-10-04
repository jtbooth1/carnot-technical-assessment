import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../db'

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
                include: {
                  links: true,
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
})

