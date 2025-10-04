'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'

export default function Me() {
  const { user, isLoading: authLoading } = useAuth()
  const { data, isLoading, error } = trpc.auth.me.useQuery()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading || isLoading) {
    return (
      <div style={{ padding: '16px' }}>
        <Navigation />
        <main>
          <h1>Me</h1>
          <p>Loading...</p>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return (
      <div style={{ padding: '16px' }}>
        <Navigation />
        <main>
          <h1>Me</h1>
          <p style={{ color: 'red' }}>Error loading profile: {error.message}</p>
        </main>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <Navigation />
      <main>
        <h1>My Profile</h1>
        
        <section style={{ marginBottom: '16px' }}>
          <h2>User Object</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            border: '1px solid #000',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(data?.user, null, 2)}
          </pre>
        </section>

        <section>
          <h2>Claims</h2>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '16px', 
            border: '1px solid #000',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {JSON.stringify(data?.claims, null, 2)}
          </pre>
        </section>
      </main>
    </div>
  )
}
