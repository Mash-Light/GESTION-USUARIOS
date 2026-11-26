export function BrandLockup({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${inverse ? 'text-white' : 'text-ink'}`}>
      <BrandMark inverse={inverse} />
      {!compact && (
        <span className="grid gap-1 leading-none">
          <strong className="font-display text-[17px] font-extrabold tracking-[.08em]">VIAMATICA</strong>
          <small className={`text-[7px] font-semibold tracking-[.32em] ${inverse ? 'text-sky-100/65' : 'text-muted'}`}>UNIVERSO DE SOLUCIONES</small>
        </span>
      )}
    </div>
  )
}

export default function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span aria-hidden="true" className="relative block h-[29px] w-[33px] shrink-0">
      <span className="absolute left-0 top-0 h-[13px] w-[22px] bg-[#30c7e2]" style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
      <span className={`absolute left-[10px] top-0 h-[29px] w-5 ${inverse ? 'bg-gradient-to-br from-cyan-300 to-sky-500' : 'bg-gradient-to-br from-cyan-400 to-sky-600'}`} style={{ clipPath: 'polygon(35% 0, 100% 0, 45% 100%, 0 100%)' }} />
    </span>
  )
}
