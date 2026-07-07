import { useEffect, useId, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { Components } from 'react-markdown'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#2F6FEB',
    primaryTextColor: '#FFFFFF',
    primaryBorderColor: '#2F6FEB',
    lineColor: '#4F86F7',
    secondaryColor: '#DCE8FD',
    tertiaryColor: '#EEF2F8',
  },
})

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const mermaidId = `mermaid-${id.replace(/[:$]/g, '')}`

  useEffect(() => {
    if (ref.current) {
      mermaid
        .render(mermaidId, code)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
          }
        })
        .catch(() => {
          if (ref.current) {
            ref.current.innerHTML = `<p class="text-destructive text-sm">Failed to render diagram</p>`
          }
        })
    }
  }, [code, mermaidId])

  return <div ref={ref} className="my-4 flex justify-center" />
}

const components: Components = {
  code({ className, children, ...props }) {
    const isInline = !className
    const language = className?.replace('language-', '') ?? ''

    if (language === 'mermaid') {
      return <MermaidBlock code={String(children).replace(/\n$/, '')} />
    }

    if (isInline) {
      return (
        <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm" {...props}>
          {children}
        </code>
      )
    }

    return (
      <div className="group relative">
        <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
        <button
          className="bg-primary/10 hover:bg-primary/20 absolute top-2 right-2 rounded px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => {
            navigator.clipboard.writeText(String(children).replace(/\n$/, ''))
          }}
        >
          Copy
        </button>
      </div>
    )
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:text-primary/80 underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    )
  },
  table({ children, ...props }) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    )
  },
  th({ children, ...props }) {
    return (
      <th className="border-border bg-muted border px-3 py-2 text-left font-medium" {...props}>
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td className="border-border border px-3 py-2" {...props}>
        {children}
      </td>
    )
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-primary text-muted-foreground border-l-2 pl-4 italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeHighlight,
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        ]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
