'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { ResearchRenderer } from '@/components/research-renderer'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'

export default function CompanyDetail() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const companyQuery = trpc.companies.get.useQuery(
    { id },
    { enabled: !!user && !!id }
  )

  if (authLoading) {
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
      <main style={{ maxWidth: '1200px' }}>
        {companyQuery.isLoading && <p>Loading company data...</p>}
        {companyQuery.error && <p style={{ color: 'red' }}>Error: {companyQuery.error.message}</p>}
        
        {companyQuery.data && (
          <div>
            <h1 style={{ marginBottom: '8px' }}>{companyQuery.data.name}</h1>
            
            {companyQuery.data.areasOfInterest && (
              <div style={{ 
                marginBottom: '24px', 
                padding: '12px', 
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                fontStyle: 'italic'
              }}>
                <strong>Areas of Interest:</strong> {companyQuery.data.areasOfInterest}
              </div>
            )}

            <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
              <div>Created by: {companyQuery.data.user.email}</div>
              <div>Created: {new Date(companyQuery.data.createdAt).toLocaleString()}</div>
            </div>

            {/* Research Tasks */}
            <section style={{ marginTop: '32px' }}>
              <h2>Research</h2>
              
              {companyQuery.data.researchTasks.length === 0 && (
                <p>No research tasks yet.</p>
              )}

              {companyQuery.data.researchTasks.map((task) => (
                <div 
                  key={task.id} 
                  style={{ 
                    marginTop: '24px',
                    padding: '16px',
                    border: '1px solid #000',
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #ccc'
                  }}>
                    <div>
                      <strong>Status:</strong> <span style={{ 
                        textTransform: 'uppercase',
                        fontWeight: 'bold',
                        color: task.status === 'COMPLETED' ? '#0a0' : 
                               task.status === 'FAILED' ? '#c00' : 
                               task.status === 'PROCESSING' ? '#fa0' : '#666'
                      }}>{task.status}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {task.error && (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fee',
                      border: '1px solid #c00',
                      color: '#c00',
                      marginBottom: '16px'
                    }}>
                      <strong>Error:</strong> {task.error}
                    </div>
                  )}

                  {task.result && (
                    <div style={{ marginTop: '16px' }}>
                      <ResearchRenderer 
                        bodytext={task.result.text} 
                        links={task.result.links} 
                      />
                    </div>
                  )}

                  {!task.result && task.status === 'PROCESSING' && (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>Research in progress...</p>
                  )}

                  {!task.result && task.status === 'PENDING' && (
                    <p style={{ fontStyle: 'italic', color: '#666' }}>Research queued...</p>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

