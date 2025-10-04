'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/auth'
import { useState, useRef, useEffect } from 'react'

export function Navigation() {
  const { user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

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
        {user && (
          <>
            <Link href="/companies" style={{ textDecoration: 'none', color: '#fff' }}>
              Companies
            </Link>
            <Link href="/admin" style={{ textDecoration: 'none', color: '#fff' }}>
              Admin
            </Link>
          </>
        )}
      </div>
      
      {user ? (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            style={{
              background: '#333',
              border: '1px solid #555',
              color: '#fff',
              cursor: 'pointer',
              padding: '8px 16px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {user.email}
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>
          
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #000',
              minWidth: '150px',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.2)',
              zIndex: 1000
            }}>
              <button
                onClick={() => {
                  logout()
                  setShowDropdown(false)
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Logout
              </button>
            </div>
          )}
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
