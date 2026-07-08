import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export type MascotExpression = 'happy' | 'thinking' | 'typing' | 'excited' | 'love'

interface MascotProps {
  expression?: MascotExpression
  className?: string
  style?: CSSProperties
}

/**
 * Chattie -- the app's bear mascot. A single reusable SVG with a shared body
 * and swappable face / arms / props so every expression stays visually
 * consistent. Colors come from the current theme (`--primary`) so it stays
 * in sync with the app's color palette.
 */
export default function Mascot({ expression = 'happy', className, style }: MascotProps) {
  return (
    <svg
      viewBox="0 0 200 220"
      fill="none"
      className={cn('h-24 w-24 shrink-0', className)}
      style={style}
      role="img"
      aria-label={`Chattie the mascot, ${expression}`}
    >
      {/* Ears */}
      <circle cx="62" cy="46" r="24" className="fill-primary" />
      <circle cx="138" cy="46" r="24" className="fill-primary" />
      <circle cx="62" cy="48" r="10" className="fill-primary-foreground" />
      <circle cx="138" cy="48" r="10" className="fill-primary-foreground" />

      {/* Body */}
      <rect x="30" y="40" width="140" height="150" rx="62" className="fill-primary" />

      {/* Feet */}
      <ellipse cx="72" cy="196" rx="20" ry="14" className="fill-primary" />
      <ellipse cx="128" cy="196" rx="20" ry="14" className="fill-primary" />

      {/* Face */}
      {expression === 'excited' ? (
        <>
          <path
            d="M74 100 Q82 92 90 100"
            className="stroke-primary-foreground"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M110 100 Q118 92 126 100"
            className="stroke-primary-foreground"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <circle cx="82" cy="100" r="9" className="fill-primary-foreground" />
          <circle cx="118" cy="100" r="9" className="fill-primary-foreground" />
        </>
      )}

      {/* Snout */}
      <ellipse cx="100" cy="122" rx="26" ry="20" className="fill-primary-foreground" />
      <ellipse cx="100" cy="112" rx="7" ry="5" className="fill-primary" />

      {/* Mouth */}
      {expression === 'thinking' ? (
        <path
          d="M90 130 Q100 122 110 130"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M88 128 Q100 138 112 128"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Arms */}
      {expression === 'happy' && (
        <path
          d="M164 132 Q178 118 172 100"
          className="stroke-primary-foreground"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {expression === 'excited' && (
        <>
          <path
            d="M162 130 Q182 112 176 90"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M38 130 Q18 112 24 90"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {(expression === 'happy' || expression === 'thinking' || expression === 'love') && (
        <path
          d="M36 132 Q22 118 28 100"
          className="stroke-primary-foreground"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {expression === 'typing' && (
        <>
          <path
            d="M40 150 Q52 138 68 150"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M160 150 Q148 138 132 150"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}

      {/* Expression props */}
      {expression === 'thinking' && (
        <text x="150" y="60" className="fill-primary" fontSize="30" fontWeight="600">
          ?
        </text>
      )}
      {expression === 'typing' && (
        <g>
          <rect x="60" y="150" width="80" height="34" rx="6" className="fill-muted" />
          <circle cx="86" cy="167" r="3" className="fill-primary" />
          <circle cx="100" cy="167" r="3" className="fill-primary" />
          <circle cx="114" cy="167" r="3" className="fill-primary" />
        </g>
      )}
      {expression === 'love' && (
        <>
          <path
            d="M100 150 C92 140 74 144 74 158 C74 172 100 186 100 186 C100 186 126 172 126 158 C126 144 108 140 100 150Z"
            className="fill-destructive"
          />
          <path
            d="M40 152 Q28 130 40 106"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M160 152 Q172 130 160 106"
            className="stroke-primary-foreground"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        </>
      )}
      {expression === 'happy' && (
        <>
          <path
            d="M28 66 L34 76"
            className="stroke-primary"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M172 66 L166 76"
            className="stroke-primary"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  )
}
