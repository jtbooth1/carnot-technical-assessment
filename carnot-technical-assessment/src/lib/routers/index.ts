import { router } from '../trpc'
import { authRouter } from './auth'
import { messagesRouter } from './messages'

export const appRouter = router({
  auth: authRouter,
  messages: messagesRouter,
})

export type AppRouter = typeof appRouter
