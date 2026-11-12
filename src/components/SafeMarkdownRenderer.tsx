import ReactMarkdown, { type Components } from 'react-markdown'

interface SafeMarkdownRendererProps {
  content: string
  className?: string
}

// Must be module-level: inline component overrides get a new identity each
// render, so React remounts the rendered DOM nodes. That detaches the node a
// touch gesture started on, which froze carousel swipes over ability text.
const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
}

export function SafeMarkdownRenderer({ content, className }: SafeMarkdownRendererProps) {
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
}
