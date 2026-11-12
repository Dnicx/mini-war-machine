import React from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'

interface SafeMarkdownRendererProps {
  content: string
  className?: string
}

// Must be module-level: inline component overrides get a new identity each
// render, so React remounts the rendered DOM nodes. That detaches the node a
// touch gesture started on, which froze carousel swipes over ability text.
const markdownComponents: Components = {
  // Ensure newlines are preserved
  // `node` is pulled out only so the mdast node isn't spread onto the DOM <br>.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  br: ({ node, ...props }) => <br {...props} />,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
}

export function SafeMarkdownRenderer({ content, className }: SafeMarkdownRendererProps) {
  try {
    if (!content || typeof content !== 'string') {
      return <div className={className}>Invalid content</div>
    }
    
    return (
      <div className={`prose prose-invert max-w-none ${className || ''}`}>
        <ReactMarkdown components={markdownComponents}>
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
