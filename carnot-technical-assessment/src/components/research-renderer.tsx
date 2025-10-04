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

  // Deduplicate links by exact URL match
  const uniqueLinks = useMemo(() => {
    const seen = new Map<string, Link>()
    for (const link of links) {
      if (!seen.has(link.url)) {
        seen.set(link.url, link)
      }
    }
    return Array.from(seen.values())
  }, [links])

  return (
    <div>
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
      
      {uniqueLinks.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h4 style={{ marginBottom: '12px', fontWeight: 'bold' }}>Sources</h4>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #000'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'left',
                  fontWeight: 'bold',
                  width: '30%'
                }}>
                  Title
                </th>
                <th style={{ 
                  border: '1px solid #000', 
                  padding: '8px', 
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  URL
                </th>
              </tr>
            </thead>
            <tbody>
              {uniqueLinks.map((link, index) => (
                <tr key={link.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ 
                    border: '1px solid #000', 
                    padding: '8px',
                    wordBreak: 'break-word'
                  }}>
                    {link.title}
                  </td>
                  <td style={{ 
                    border: '1px solid #000', 
                    padding: '8px',
                    wordBreak: 'break-all'
                  }}>
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: '#0066cc', 
                        textDecoration: 'underline' 
                      }}
                    >
                      {link.url}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

