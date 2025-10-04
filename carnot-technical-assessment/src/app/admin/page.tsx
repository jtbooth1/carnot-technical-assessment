'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'

export default function Admin() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: !!user,
  })

  if (isLoading) {
    return (
      <div style={{ padding: '16px' }}>
        <Navigation />
        <main>
          <h1>Loading...</h1>
        </main>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ padding: '16px' }}>
      <Navigation />
      <main>
        <h1>Admin</h1>
        
        <section style={{ marginTop: '24px', padding: '16px', border: '1px solid #000', maxWidth: '600px' }}>
          <h2 style={{ marginTop: 0 }}>Organization Details</h2>
          
          {meQuery.isLoading && <p>Loading details...</p>}
          {meQuery.error && <p style={{ color: 'red' }}>Error: {meQuery.error.message}</p>}
          
          {meQuery.data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Organization:</strong> {meQuery.data.user.organization.name}
              </div>
              <div>
                <strong>Your Email:</strong> {meQuery.data.user.email}
              </div>
            </div>
          )}
        </section>

        <section style={{ marginTop: '24px', padding: '16px', border: '1px solid #000', maxWidth: '600px', backgroundColor: '#f9f9f9' }}>
          <p style={{ margin: 0, fontStyle: 'italic' }}>
            This is a demo app. Here you would be able to invite additional users, handle API rate limits, etc.
          </p>
        </section>
      </main>
    </div>
  )
}

