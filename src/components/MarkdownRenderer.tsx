import { useEffect, useId, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkEmoji from 'remark-emoji'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import type { Components } from 'react-markdown'
import mermaid from 'mermaid'
import { cn } from '@/lib/utils'
import type { SourceLink } from '@/types'
import { renderContentPipeline } from '@/utils/sourceLinks'

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
  const [svgContent, setSvgContent] = useState('')

  useEffect(() => {
    if (ref.current) {
      mermaid
        .render(mermaidId, code)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
            setSvgContent(svg)
          }
        })
        .catch(() => {
          if (ref.current) {
            ref.current.innerHTML = `<p class="text-destructive text-sm">Failed to render diagram</p>`
          }
        })
    }
  }, [code, mermaidId])

  const handleDownloadPng = async () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(img, 0, 0)
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return
        const pngUrl = URL.createObjectURL(pngBlob)
        const a = document.createElement('a')
        a.href = pngUrl
        a.download = 'diagram.png'
        a.click()
        URL.revokeObjectURL(pngUrl)
      }, 'image/png')
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  return (
    <div className="group relative my-4 flex justify-center">
      <div ref={ref} />
      {svgContent && (
        <button
          onClick={handleDownloadPng}
          className="bg-background border-border hover:border-primary hover:text-primary absolute top-2 right-2 rounded-full border px-2.5 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          Download PNG
        </button>
      )}
    </div>
  )
}

function PlantUMLBlock({ code }: { code: string }) {
  const encoded = btoa(code)
  const url = `https://www.plantuml.com/plantuml/svg/${encodeURIComponent(encoded)}`

  return (
    <div className="my-4 flex justify-center">
      <img src={url} alt="PlantUML Diagram" className="max-w-full rounded-lg" />
    </div>
  )
}

function HTMLPreviewBlock({ code }: { code: string }) {
  return (
    <div className="my-4 overflow-hidden rounded-xl border">
      <iframe
        srcDoc={code}
        title="HTML Preview"
        className="h-[300px] w-full"
        sandbox="allow-scripts"
      />
    </div>
  )
}

const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'JavaScript',
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  jsx: 'JavaScript React',
  py: 'Python',
  rb: 'Ruby',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  swift: 'Swift',
  kt: 'Kotlin',
  scss: 'SCSS',
  less: 'Less',
  yml: 'YAML',
  yaml: 'YAML',
  mermaid: 'Mermaid',
  plantuml: 'PlantUML',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  sh: 'Shell',
  bash: 'Bash',
  json: 'JSON',
  xml: 'XML',
  md: 'Markdown',
  dockerfile: 'Dockerfile',
}

const DOWNLOAD_EXTENSIONS: Record<string, string> = {
  csv: 'csv',
  tsv: 'tsv',
  json: 'json',
  xml: 'xml',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'md',
  text: 'txt',
  sh: 'sh',
  bash: 'sh',
}

const components: Components = {
  pre({ children }) {
    return <>{children}</>
  },
  h1({ children, ...props }) {
    return (
      <h1
        className="mt-8 mb-3 text-2xl font-semibold tracking-tight first:mt-0 [&_a]:no-underline"
        {...props}
      >
        {children}
      </h1>
    )
  },
  h2({ children, ...props }) {
    return (
      <h2
        className="mt-7 mb-3 text-xl font-semibold tracking-tight first:mt-0 [&_a]:no-underline"
        {...props}
      >
        {children}
      </h2>
    )
  },
  h3({ children, ...props }) {
    return (
      <h3 className="mt-6 mb-2 text-lg font-semibold first:mt-0 [&_a]:no-underline" {...props}>
        {children}
      </h3>
    )
  },
  h4({ children, ...props }) {
    return (
      <h4 className="mt-5 mb-2 text-base font-semibold first:mt-0 [&_a]:no-underline" {...props}>
        {children}
      </h4>
    )
  },
  h5({ children, ...props }) {
    return (
      <h5 className="mt-4 mb-2 text-sm font-semibold first:mt-0 [&_a]:no-underline" {...props}>
        {children}
      </h5>
    )
  },
  h6({ children, ...props }) {
    return (
      <h6
        className="text-muted-foreground mt-4 mb-2 text-sm font-semibold first:mt-0 [&_a]:no-underline"
        {...props}
      >
        {children}
      </h6>
    )
  },
  p({ children, ...props }) {
    return (
      <p className="my-3 leading-7 first:mt-0 last:mb-0" {...props}>
        {children}
      </p>
    )
  },
  ul({ children, ...props }) {
    return (
      <ul
        className="marker:text-muted-foreground my-3 list-disc space-y-1.5 pl-6 first:mt-0 last:mb-0"
        {...props}
      >
        {children}
      </ul>
    )
  },
  ol({ children, ...props }) {
    return (
      <ol
        className="marker:text-muted-foreground my-3 list-decimal space-y-1.5 pl-6 first:mt-0 last:mb-0"
        {...props}
      >
        {children}
      </ol>
    )
  },
  li({ children, ...props }) {
    return (
      <li className="pl-1 leading-7 [&>ol]:my-1 [&>p]:my-0 [&>ul]:my-1" {...props}>
        {children}
      </li>
    )
  },
  strong({ children, ...props }) {
    return (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    )
  },
  em({ children, ...props }) {
    return (
      <em className="italic" {...props}>
        {children}
      </em>
    )
  },
  hr(props) {
    return <hr className="border-border my-6" {...props} />
  },
  input({ type, checked, disabled, ...props }) {
    if (type == 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          readOnly
          className="accent-primary mr-2 -translate-y-px align-middle"
          {...props}
        />
      )
    }
    return <input type={type} {...props} />
  },
  code({ className, children, ...props }) {
    const isInline = !className
    const language = className?.replace('language-', '') ?? ''

    if (language == 'mermaid') {
      return <MermaidBlock code={String(children).replace(/\n$/, '')} />
    }

    if (language == 'plantuml') {
      return <PlantUMLBlock code={String(children).replace(/\n$/, '')} />
    }

    if (language == 'html') {
      return <HTMLPreviewBlock code={String(children).replace(/\n$/, '')} />
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

    const codeString = String(children).replace(/\n$/, '')
    const lines = codeString.split('\n')
    const langLabel = LANGUAGE_ALIASES[language] ?? language
    const ext = DOWNLOAD_EXTENSIONS[language]

    const handleDownload = () => {
      const blob = new Blob([codeString], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `code.${ext ?? 'txt'}`
      a.click()
      URL.revokeObjectURL(url)
    }

    return (
      <div className="group my-4 overflow-hidden rounded-xl border">
        {langLabel && (
          <div className="bg-muted/50 border-border flex items-center justify-between border-b px-4 py-1.5">
            <span className="text-muted-foreground text-xs font-medium">{langLabel}</span>
            <div className="flex gap-1">
              <button
                className="text-muted-foreground hover:text-foreground text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(codeString)
                }}
              >
                Copy
              </button>
              {ext && (
                <button
                  className="text-muted-foreground hover:text-foreground text-xs"
                  onClick={handleDownload}
                >
                  Download
                </button>
              )}
            </div>
          </div>
        )}
        <pre className="overflow-x-auto p-4 text-sm">
          <code className={cn('font-mono', className)}>
            {lines.length > 1
              ? lines.map((line, i) => (
                  <span key={i} className="table-row">
                    <span className="text-muted-foreground/30 table-cell pr-4 text-right text-xs select-none">
                      {i + 1}
                    </span>
                    <span className="table-cell">{line || ' '}</span>
                  </span>
                ))
              : codeString}
          </code>
        </pre>
      </div>
    )
  },
  a({ href, children, ...props }) {
    return (
      <a
        href={href}
        className="text-primary hover:text-primary/80 underline underline-offset-2"
        {...props}
      >
        {children}
      </a>
    )
  },
  table({ children, ...props }) {
    return (
      <div className="border-border my-4 overflow-x-auto rounded-lg border first:mt-0 last:mb-0">
        <table className="w-full border-collapse text-sm" {...props}>
          {children}
        </table>
      </div>
    )
  },
  th({ children, ...props }) {
    return (
      <th
        className="bg-muted label-mono border-border border-b px-3 py-2 text-left font-semibold"
        {...props}
      >
        {children}
      </th>
    )
  },
  td({ children, ...props }) {
    return (
      <td
        className="border-border border-b px-3 py-2 [tbody_tr:last-child_&]:border-b-0"
        {...props}
      >
        {children}
      </td>
    )
  },
  blockquote({ children, ...props }) {
    return (
      <blockquote
        className="border-border text-muted-foreground my-3 border-l-2 pl-4 first:mt-0 last:mb-0 [&>p]:my-1"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
}

interface MarkdownRendererProps {
  content: string
  sources?: SourceLink[]
}

export default function MarkdownRenderer({ content, sources }: MarkdownRendererProps) {
  const processed = renderContentPipeline(content, sources)

  return (
    <div className="prose prose-sm max-w-none min-w-0 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
        rehypePlugins={[
          rehypeKatex,
          [rehypeHighlight, { theme: 'github-dark' }],
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
        ]}
        components={components}
      >
        {processed}
      </ReactMarkdown>
    </div>
  )
}
