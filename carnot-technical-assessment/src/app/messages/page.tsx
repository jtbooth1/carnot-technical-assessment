'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Navigation } from '@/components/navigation'
import { trpc } from '@/lib/trpc-client'
import { useAuth } from '@/contexts/auth'
import { buttonStyle } from '@/components/styles'

export default function Messages() {
  const [content, setContent] = useState('')
  const [message, setMessage] = useState('')
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router])

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: (data) => {
      setMessage(`Message sent successfully! ChatGPT response: ${data.response}`)
      setContent('')
      setTimeout(() => setMessage(''), 5000)
    },
    onError: (error) => {
      setMessage(`Error: ${error.message}`)
      setTimeout(() => setMessage(''), 3000)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    
    setMessage('')
    sendMutation.mutate({ content: content.trim() })
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
        <h1>Send Message</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '600px' }}>
          <div>
            <label htmlFor="content" style={{ display: 'block', marginBottom: '4px' }}>Message:</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={1000}
              rows={4}
              style={{ width: '100%', padding: '8px', border: '1px solid #000', resize: 'vertical' }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {content.length}/1000 characters
            </div>
          </div>
          {message && (
            <div style={{ 
              color: message.includes('Error') ? 'red' : 'green', 
              fontSize: '14px',
              padding: '8px',
              border: '1px solid',
              borderColor: message.includes('Error') ? 'red' : 'green'
            }}>
              {message}
            </div>
          )}
          <button
            type="submit"
            disabled={sendMutation.isPending || !content.trim()}
            style={{
              ...buttonStyle,
              cursor: (sendMutation.isPending || !content.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {sendMutation.isPending ? 'Sending...' : 'Send Message'}
          </button>
        </form>
      </main>
    </div>
  )
}
