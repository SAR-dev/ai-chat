import type { SourceLink } from '@/types'

export function stripReferenceLinks(content: string): string {
  const lines = content.split('\n')
  const refIndex = lines.findIndex((l) =>
    l.trim().match(/^#{1,3}\s*(参考|references|sources|sources:)/i),
  )
  return refIndex >= 0 ? lines.slice(0, refIndex).join('\n') : content
}

export function applyCitationLinks(content: string, sources: SourceLink[]): string {
  const sourceMap = new Map(sources.map((s) => [s.index, s]))

  let result = content

  result = result.replace(/記事(\d+)「([^」]+)」/g, (_, n, title) => {
    const src = sourceMap.get(Number(n))
    return src ? `[${title}](${src.url})` : `[${title}](#)`
  })

  result = result.replace(/記事(\d+)/g, (_, n) => {
    const src = sourceMap.get(Number(n))
    return src ? `[${src.title}](${src.url})` : `[Source ${n}](#)`
  })

  result = result.replace(/【\s*\[(\d+)]\s*】/g, (_, n) => {
    const src = sourceMap.get(Number(n))
    return src ? `[${src.title}](${src.url})` : `[Source ${n}](#)`
  })

  result = result.replace(/【(\d+)】/g, (_, n) => {
    const src = sourceMap.get(Number(n))
    return src ? `[${src.title}](${src.url})` : `[Source ${n}](#)`
  })

  return result
}

export function sanitizeMathContent(content: string): string {
  let result = content

  result = result.replace(/\\\[/g, '$$$$').replace(/\\]/g, '$$$$')

  result = result.replace(/(\$\$[\s\S]*?\$\$)/g, (match) => {
    return match.replace(/\*\*/g, '')
  })
  result = result.replace(/(\$[^\n$]+\$)/g, (match) => {
    return match.replace(/\*\*/g, '')
  })

  return result
}

export function renumberSources(sources: SourceLink[]): SourceLink[] {
  return sources.map((s, i) => ({ ...s, index: i + 1 }))
}

export function renderContentPipeline(content: string, sources?: SourceLink[]): string {
  let result = stripReferenceLinks(content)
  if (sources && sources.length > 0) {
    result = applyCitationLinks(result, sources)
  }
  result = sanitizeMathContent(result)
  return result
}
