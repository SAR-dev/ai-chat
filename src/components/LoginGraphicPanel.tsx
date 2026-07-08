export default function LoginGraphicPanel() {
  return (
    <div className="relative hidden h-full w-full overflow-hidden bg-[#16283f] lg:block">
      {/* Soft layered gradient blobs -- the panel's one graphic gesture */}
      <div
        className="absolute -top-24 -left-24 h-[26rem] w-[26rem] rounded-full opacity-70 blur-3xl"
        style={{ background: 'radial-gradient(circle, #4a6f9e 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/3 -right-32 h-[30rem] w-[30rem] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7fa3c9 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 h-[24rem] w-[24rem] rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, #1f3a5f 0%, transparent 70%)' }}
      />

      {/* Grain texture for warmth, matched to the rest of the app's paper-like feel */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.05] mix-blend-overlay" aria-hidden>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>

      <div className="relative flex h-full flex-col items-start justify-end p-14">
        <svg viewBox="0 0 32 32" fill="none" className="mb-8 h-10 w-10" aria-hidden>
          <g fill="#f4f1ea">
            <rect x="14.5" y="6" width="3" height="20" rx="1.5" />
            <rect x="14.5" y="6" width="3" height="20" rx="1.5" transform="rotate(60 16 16)" />
            <rect x="14.5" y="6" width="3" height="20" rx="1.5" transform="rotate(120 16 16)" />
          </g>
        </svg>
        <p className="max-w-sm text-2xl leading-snug font-medium text-[#f4f1ea]">
          A calmer place to think things through, together.
        </p>
      </div>
    </div>
  )
}
