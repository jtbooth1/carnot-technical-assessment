'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'
import { buttonStyle } from '@/components/styles'

export default function Companies() {
  const [name, setName] = useState('')
  const [areasOfInterest, setAreasOfInterest] = useState('')
  const [error, setError] = useState('')
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  const companiesQuery = trpc.companies.list.useQuery()
  
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      setName('')
      setAreasOfInterest('')
      setError('')
      companiesQuery.refetch()
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      companiesQuery.refetch()
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const checkStatusMutation = trpc.companies.checkStatus.useMutation({
    onSuccess: () => {
      companiesQuery.refetch()
    },
    onError: (error) => {
      setError(error.message)
    }
  })

  const isPollingRef = useRef(false)

  useEffect(() => {
    if (!user) return

    const pollOnce = async () => {
      if (isPollingRef.current) return
      isPollingRef.current = true
      try {
        const items = companiesQuery.data || []
        const ids = items
          .filter((c) => c.researchTasks.length > 0 && (c.researchTasks[0].status === 'PENDING' || c.researchTasks[0].status === 'PROCESSING'))
          .map((c) => c.id)

        for (const id of ids) {
          await checkStatusMutation.mutateAsync({ id })
        }

        if (ids.length > 0) {
          await companiesQuery.refetch()
        }
      } catch {
        // ignore polling errors
      } finally {
        isPollingRef.current = false
      }
    }

    const interval = setInterval(pollOnce, 5000)
    return () => clearInterval(interval)
  }, [user, companiesQuery, checkStatusMutation])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate({ name, areasOfInterest: areasOfInterest || undefined })
  }

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
        <h1>Companies</h1>
        
        {/* Add Company Form */}
        <section style={{ marginBottom: '16px', padding: '16px', border: '1px solid #000' }}>
          <h2>Add Company</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
            <div>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '4px' }}>
                Company Name:
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px', border: '1px solid #000' }}
              />
            </div>
            <div>
              <label htmlFor="areasOfInterest" style={{ display: 'block', marginBottom: '4px' }}>
                Areas of Interest:
              </label>
              <textarea
                id="areasOfInterest"
                value={areasOfInterest}
                onChange={(e) => setAreasOfInterest(e.target.value)}
                rows={4}
                placeholder="Optional: Describe what aspects of this company you want to research"
                style={{ width: '100%', padding: '8px', border: '1px solid #000', resize: 'vertical' }}
              />
            </div>
            {error && (
              <div style={{ color: 'red', fontSize: '14px' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={createMutation.isPending}
              style={{ ...buttonStyle, cursor: createMutation.isPending ? 'not-allowed' : 'pointer' }}
            >
              {createMutation.isPending ? 'Adding...' : 'Add Company'}
            </button>
          </form>
        </section>

        {/* Companies List */}
        <section>
          <h2>Your Companies</h2>
          {companiesQuery.isLoading && <p>Loading companies...</p>}
          {companiesQuery.error && <p style={{ color: 'red' }}>Error: {companiesQuery.error.message}</p>}
          
          {companiesQuery.data && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '16px',
              marginTop: '16px'
            }}>
              {companiesQuery.data.length === 0 ? (
                <p>No companies yet. Add your first company above!</p>
              ) : (
                companiesQuery.data.map((company) => (
                  <div
                    key={company.id}
                    style={{
                      border: '1px solid #000',
                      padding: '16px',
                      minWidth: '250px',
                      maxWidth: '300px',
                      flex: '1 1 250px',
                      position: 'relative',
                    }}
                  >
                    <button
                      aria-label="Delete company"
                      title="Delete"
                      onClick={() => {
                        if (deleteMutation.isPending) return
                        const ok = window.confirm('Delete this company and all associated research? This cannot be undone.')
                        if (!ok) return
                        deleteMutation.mutate({ id: company.id })
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        background: '#000',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '2px',
                        cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                        lineHeight: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      ×
                    </button>
                    <h3 style={{ margin: '0 0 8px 0' }}>{company.name}</h3>
                    {company.areasOfInterest && (
                      <p style={{ 
                        fontSize: '14px', 
                        margin: '8px 0',
                        fontStyle: 'italic',
                        color: '#333'
                      }}>
                        {company.areasOfInterest}
                      </p>
                    )}
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      <div>Created by: {company.user.email}</div>
                      <div>
                        Created: {new Date(company.createdAt).toLocaleDateString()}
                      </div>
                      {company.researchTasks.length > 0 && (
                        <div style={{ marginTop: '8px', fontWeight: 'bold' }}>
                          Latest research: {company.researchTasks[0].status}
                        </div>
                      )}
                      {company.researchTasks.length > 0 && company.researchTasks[0].status === 'PROCESSING' && (
                        <button
                          onClick={() => {
                            if (checkStatusMutation.isPending) return
                            checkStatusMutation.mutate({ id: company.id })
                          }}
                          disabled={checkStatusMutation.isPending}
                          style={{ 
                            ...buttonStyle, 
                            marginTop: '8px', 
                            cursor: checkStatusMutation.isPending ? 'not-allowed' : 'pointer' 
                          }}
                        >
                          {checkStatusMutation.isPending ? 'Checking…' : 'Check Status'}
                        </button>
                      )}
                      {company.private && (
                        <div style={{ marginTop: '4px', fontStyle: 'italic' }}>
                          Private
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

