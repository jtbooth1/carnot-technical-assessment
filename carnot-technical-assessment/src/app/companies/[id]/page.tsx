'use client'

import { useEffect, useState } from 'react'
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
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const companyQuery = trpc.companies.get.useQuery(
    { id },
    { enabled: !!user && !!id }
  )

  const checkStatusMutation = trpc.companies.checkStatus.useMutation()
  const digDeeperMutation = trpc.companies.digDeeper.useMutation()

  // Default to opening the first task
  useEffect(() => {
    if (companyQuery.data?.researchTasks.length) {
      const firstTaskId = companyQuery.data.researchTasks[0].id
      setExpandedTasks(prev => {
        if (!prev.has(firstTaskId)) {
          const next = new Set(prev)
          next.add(firstTaskId)
          return next
        }
        return prev
      })
    }
  }, [companyQuery.data?.researchTasks])

  // Polling: check status every 3 seconds if there are active tasks
  useEffect(() => {
    if (!companyQuery.data) return

    const hasActiveTasks = companyQuery.data.researchTasks.some(
      t => t.status === 'PENDING' || t.status === 'PROCESSING'
    )

    if (!hasActiveTasks) return

    const interval = setInterval(async () => {
      try {
        const result = await checkStatusMutation.mutateAsync({ id })
        if (result.updated) {
          // Refetch to get the latest data
          companyQuery.refetch()
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [companyQuery.data, id])

  const toggleTask = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const handleDigDeeper = async (followupId: string) => {
    try {
      await digDeeperMutation.mutateAsync({ followupId })
      // Refetch to show the new task
      await companyQuery.refetch()
    } catch (err) {
      console.error('Dig deeper error:', err)
      alert('Failed to start followup research')
    }
  }

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
    <div style={{ padding: '16px', paddingRight: '32px' }}>
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

            <div style={{ display: 'flex', gap: '24px', marginTop: '32px' }}>
              {/* Main Research Tasks - 75% */}
              <section style={{ flex: '0 0 75%' }}>
              
              {companyQuery.data.researchTasks.length === 0 && (
                <p>No research tasks yet.</p>
              )}

              {companyQuery.data.researchTasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id)
                
                return (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={() => toggleTask(task.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'transform 0.2s',
                        }}
                      >
                        <span style={{
                          display: 'inline-block',
                          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                        }}>
                          ▶
                        </span>
                      </button>
                      <div>
                        <strong>Status:</strong> <span style={{ 
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          color: task.status === 'COMPLETED' ? '#0a0' : 
                                 task.status === 'FAILED' ? '#c00' : 
                                 task.status === 'PROCESSING' ? '#fa0' : '#666'
                        }}>{task.status}</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {isExpanded && (
                    <>
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
                    </>
                  )}
                </div>
                )
              })}
              </section>

              {/* Followups Sidebar - 25% */}
              {(() => {
                const completedTask = companyQuery.data.researchTasks.find(t => t.status === 'COMPLETED' && t.result?.followups)
                const followups = completedTask?.result?.followups || []
                
                return (
                  <aside style={{ flex: '0 0 25%' }}>
                    <h3 style={{ marginBottom: '16px', marginTop: '0' }}>Follow-ups</h3>
                    {followups.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {followups.map((followup) => (
                          <div
                            key={followup.id}
                            style={{
                              padding: '12px',
                              border: '1px solid #000',
                              backgroundColor: '#fafafa',
                              fontSize: '14px',
                              position: 'relative',
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>
                              {followup.topic}
                            </div>
                            <div style={{ color: '#444', fontSize: '13px', marginBottom: '12px' }}>
                              {followup.detail}
                            </div>
                            <button
                              onClick={() => handleDigDeeper(followup.id)}
                              disabled={digDeeperMutation.isPending}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #000',
                                backgroundColor: '#fff',
                                cursor: digDeeperMutation.isPending ? 'not-allowed' : 'pointer',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                width: '100%',
                              }}
                            >
                              {digDeeperMutation.isPending ? 'Starting...' : 'Dig Deeper →'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic' }}>
                        No follow-ups yet.
                      </p>
                    )}
                  </aside>
                )
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

