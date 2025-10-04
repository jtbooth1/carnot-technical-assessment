import { initTRPC, TRPCError } from '@trpc/server'
import { verifyToken, JWTPayload } from './auth'

const t = initTRPC.context<{ user?: JWTPayload }>().create()

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

export function createContext({ req }: { req: Request }) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  let user: JWTPayload | undefined

  if (token) {
    user = verifyToken(token)
  }

  return { user }
}
