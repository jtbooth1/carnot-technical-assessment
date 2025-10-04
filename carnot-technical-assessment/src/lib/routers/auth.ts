import { z } from 'zod'
import { router, publicProcedure, protectedProcedure } from '../trpc'
import { db } from '../db'
import { hashPassword, verifyPassword, generateToken } from '../auth'

export const authRouter = router({
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
      organizationName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const existingUser = await db.user.findUnique({
        where: { email: input.email }
      })

      if (existingUser) {
        throw new Error('User already exists')
      }

      const hashedPassword = await hashPassword(input.password)
      
      // Create organization first (default name based on email if not provided)
      const orgName = input.organizationName || `${input.email.split('@')[0]}'s Organization`
      const organization = await db.organization.create({
        data: {
          name: orgName,
        }
      })
      
      // Create user linked to the new organization
      const user = await db.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          organizationId: organization.id,
        }
      })

      const token = generateToken(user.id, organization.id)

      return { 
        token, 
        user: { 
          id: user.id, 
          email: user.email,
          organizationId: organization.id,
          organizationName: organization.name,
        } 
      }
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .mutation(async ({ input }) => {
      const user = await db.user.findUnique({
        where: { email: input.email },
        select: {
          id: true,
          email: true,
          password: true,
          organizationId: true,
        }
      })

      if (!user || !(await verifyPassword(input.password, user.password))) {
        throw new Error('Invalid credentials')
      }

      const token = generateToken(user.id, user.organizationId)

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
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })

      if (!user) {
        throw new Error('User not found')
      }

      return {
        user,
        claims: { 
          userId: ctx.user.userId,
          organizationId: ctx.user.organizationId
        }
      }
    }),
})
