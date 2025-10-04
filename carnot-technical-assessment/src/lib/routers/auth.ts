import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { db } from '../db'
import { hashPassword, verifyPassword, generateToken } from '../auth'

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const existingUser = await db.user.findUnique({
        where: { email: input.email }
      })

      if (existingUser) {
        throw new Error('User already exists')
      }

      const hashedPassword = await hashPassword(input.password)
      
      const user = await db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
        }
      })

      const token = generateToken(user.id)

      return { token, user: { id: user.id, email: user.email } }
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email }
      })

      if (!user || !(await verifyPassword(input.password, user.password))) {
        throw new Error('Invalid credentials')
      }

      const token = generateToken(user.id)

      return { token, user: { id: user.id, email: user.email } }
    }),

  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await db.user.findUnique({
        where: { id: ctx.user.userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      return {
        user,
        claims: { userId: ctx.user.userId }
      }
    }),
})
