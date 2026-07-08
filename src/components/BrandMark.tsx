import { cn } from '@/lib/utils'

interface BrandMarkProps {
  className?: string
}

export default function BrandMark({ className }: BrandMarkProps) {
  return (
    <img
      src="/brand/logo.png"
      alt="Chattie"
      className={cn('h-8 w-8 shrink-0 object-contain', className)}
    />
  )
}
