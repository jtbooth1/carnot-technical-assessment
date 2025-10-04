'use client'

import { useMemo } from 'react'

interface Link {
  id: string
  url: string
  title: string
  startIndex: number
  endIndex: number
}

interface ResearchRendererProps {
  bodytext: string
  links: Link[]
}

export function ResearchRenderer({ bodytext, links }: ResearchRendererProps) {
  const renderedContent = useMemo(() => {
    // Parse markdown-style links [domain](url) and replace with HTML links
    // We'll use a simple regex approach for now
    
    let html = bodytext

    // Escape HTML to prevent XSS
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Convert markdown links [text](url) to HTML links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0066cc; text-decoration: underline;">$1</a>'
    )

    // Convert newlines to br tags
    html = html.replace(/\n/g, '<br />')


    return html
  }, [bodytext])

  return (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6',
        color: '#000',
        maxWidth: '100%',
        wordWrap: 'break-word',
      }}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  )
}

