'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { useAuth } from '@/contexts/auth'

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

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
        <h1>Deep Research Platform</h1>
      </main>
    </div>
  )
}