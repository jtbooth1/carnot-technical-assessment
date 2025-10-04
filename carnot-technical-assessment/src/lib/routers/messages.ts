import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { db } from '../db'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
      
      try {
        // Send to ChatGPT using the cheapest model (gpt-3.5-turbo)
        const completion = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "user", content: input.content }
          ],
          max_tokens: 100, // Keep response short for cost efficiency
        })

        const response = completion.choices[0]?.message?.content
        console.log(`ChatGPT response: ${response}`)
        
        return { 
          success: true, 
          response: response || 'No response received'
        }
      } catch (error) {
        console.error('OpenAI API error:', error)
        return { 
          success: true, 
          response: 'Error: Could not get ChatGPT response'
        }
      }
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
