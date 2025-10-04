import { router } from '../trpc'
import { authRouter } from './auth'
import { messagesRouter } from './messages'
import { companiesRouter } from './companies'

export const appRouter = router({
  auth: authRouter,
  messages: messagesRouter,
  companies: companiesRouter,
})

export type AppRouter = typeof appRouter
