'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { buttonStyle } from './styles'

export function Navigation() {
  const { user, logout } = useAuth()

  return (
    <nav style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '16px', 
      borderBottom: '1px solid #000',
      marginBottom: '16px',
      backgroundColor: '#000'
    }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#fff' }}>
          Home
        </Link>
        
        {user && (
          <>
            <Link href="/messages" style={{ textDecoration: 'none', color: '#fff' }}>
              Messages
            </Link>
            <Link href="/me" style={{ textDecoration: 'none', color: '#fff' }}>
              Me
            </Link>
          </>
        )}
      </div>
      
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: '#fff' }}>Welcome, {user.email}</span>
          <button 
            onClick={logout}
            style={buttonStyle}
          >
            Logout
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link href="/login" style={{ textDecoration: 'none', color: '#fff' }}>
            Login
          </Link>
          <Link href="/register" style={{ textDecoration: 'none', color: '#fff' }}>
            Register
          </Link>
        </div>
      )}
    </nav>
  )
}
