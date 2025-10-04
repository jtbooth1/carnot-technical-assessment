'use client'

import { Navigation } from '@/components/navigation'
import { useAuth } from '@/contexts/auth'

export default function Home() {
  const { user, isLoading } = useAuth()

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

  return (
    <div style={{ padding: '16px' }}>
      <Navigation />
      <main>
        <h1>Welcome to Carnot Technical Assessment</h1>
        {user ? (
          <div>
            <p>Hello, {user.email}!</p>
            <p>You are logged in. Use the navigation above to access the app features.</p>
          </div>
        ) : (
          <div>
            <p>Please log in or register to access the app features.</p>
          </div>
        )}
      </main>
    </div>
  )
}