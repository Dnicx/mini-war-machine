import React from 'react'
import ReactMarkdown from 'react-markdown'

interface SafeMarkdownRendererProps {
  content: string
  className?: string
}

export function SafeMarkdownRenderer({ content, className }: SafeMarkdownRendererProps) {
  try {
    if (!content || typeof content !== 'string') {
      return <div className={className}>Invalid content</div>
    }
    
    return (
      <div className={`prose prose-invert max-w-none ${className || ''}`}>
        <ReactMarkdown 
          components={{
            // Ensure newlines are preserved
            br: ({ node, ...props }) => <br {...props} />,
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    )
  } catch (error) {
    console.error('Markdown rendering error:', error)
    // Fallback to regular text rendering with preserved newlines
    return (
      <div className={className}>
        {content.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    )
  }
}
