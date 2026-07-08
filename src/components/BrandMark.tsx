import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
}

export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn('h-8 w-8 shrink-0', className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <g className="fill-primary-foreground">
        <rect x="14.5" y="6" width="3" height="20" rx="1.5" />
        <rect x="14.5" y="6" width="3" height="20" rx="1.5" transform="rotate(60 16 16)" />
        <rect x="14.5" y="6" width="3" height="20" rx="1.5" transform="rotate(120 16 16)" />
      </g>
    </svg>
  )
}
