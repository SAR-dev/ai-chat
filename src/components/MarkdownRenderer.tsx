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
import { cn } from '@/lib/utils'

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#E8EDF4',
    primaryTextColor: '#1F3A5F',
    primaryBorderColor: '#1F3A5F',
    lineColor: '#1F3A5F',
    secondaryColor: '#F0EEE8',
    tertiaryColor: '#FFFFFF',
    fontFamily: 'Inter Variable, system-ui, sans-serif',
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
        <code
          className="bg-muted text-accent-foreground rounded-md px-1.5 py-0.5 font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <div className="group relative">
        <pre className="bg-muted border-border overflow-x-auto rounded-xl border p-4 text-sm">
          <code className={cn('font-mono', className)} {...props}>
            {children}
          </code>
        </pre>
        <button
          className="bg-background border-border hover:border-primary hover:text-primary label-mono absolute top-2 right-2 rounded-full border px-2.5 py-1 opacity-0 transition-opacity group-hover:opacity-100"
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
      <th className="border-border bg-muted label-mono border px-3 py-2 text-left" {...props}>
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
      <blockquote className="border-primary text-muted-foreground border-l-2 pl-4" {...props}>
        {children}
      </blockquote>
    )
  },
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert min-w-0 max-w-none break-words">
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
