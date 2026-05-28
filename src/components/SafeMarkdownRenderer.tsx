import ReactMarkdown from 'react-markdown'

interface SafeMarkdownRendererProps {
  content: string
  className?: string
}

export function SafeMarkdownRenderer({ content, className }: SafeMarkdownRendererProps) {
  if (!content || typeof content !== 'string') {
    return <div className={className}>Invalid content</div>
  }

  return (
    <div className={`prose prose-invert max-w-none ${className || ''}`}>
      <ReactMarkdown
        components={{
          // Ensure newlines are preserved
          br: ({ ...props }) => <br {...props} />,
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
