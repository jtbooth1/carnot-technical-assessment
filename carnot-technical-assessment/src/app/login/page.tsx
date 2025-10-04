'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'
import { buttonStyle } from '@/components/styles'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { login } = useAuth()

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user)
      router.push('/')
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    loginMutation.mutate({ email, password })
  }

  return (
    <div style={{ padding: '16px' }}>
      <Navigation />
      <main>
        <h1>Login</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '400px' }}>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>Email:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #000' }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '4px' }}>Password:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #000' }}
            />
          </div>
          {error && (
            <div style={{ color: 'red', fontSize: '14px' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loginMutation.isPending}
            style= {{ ...buttonStyle, cursor: loginMutation.isPending ? 'not-allowed' : 'pointer' }}
          >
            {loginMutation.isPending ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </main>
    </div>
  )
}
