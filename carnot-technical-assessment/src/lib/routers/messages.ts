import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../db'

export const messagesRouter = router({
  send: protectedProcedure
    .input(z.object({
      content: z.string().min(1).max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.user.userId },
        select: { email: true }
      })

      console.log(`Message from ${user?.email}: ${input.content}`)
      
      return { success: true }
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const messages = await db.message.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      })

      return messages
    }),
})
