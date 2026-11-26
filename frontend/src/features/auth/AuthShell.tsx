import { LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandLockup } from '../../shared/components/BrandMark'

export default function AuthShell({ children, eyebrow = 'PLATAFORMA DE GESTIÓN', title, description }: { children: ReactNode; eyebrow?: string; title: ReactNode; description: string }) {
  return (
    <main className="grid min-h-dvh bg-white min-[780px]:grid-cols-[43%_57%]">
      <aside aria-label="Información de la aplicación" className="relative hidden min-h-dvh overflow-hidden bg-[radial-gradient(ellipse_at_78%_12%,#145778_0%,#092f43_40%,#071d2c_100%)] px-8 py-8 text-white min-[780px]:flex min-[780px]:flex-col min-[780px]:justify-between min-[780px]:px-[clamp(38px,8vw,116px)] min-[780px]:py-[34px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.14] [background-image:linear-gradient(rgba(134,213,235,.26)_1px,transparent_1px),linear-gradient(90deg,rgba(134,213,235,.26)_1px,transparent_1px)] [background-size:50px_50px] [mask-image:linear-gradient(130deg,#000,transparent_68%)]" />
        <div aria-hidden="true" className="auth-orbit auth-orbit-one" />
        <div aria-hidden="true" className="auth-orbit auth-orbit-two" />
        <BrandLockup inverse />

        <div className="relative z-[1] max-w-[470px] animate-[auth-enter_.56s_cubic-bezier(.2,.75,.25,1)_both]">
          <p className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-cyan-200"><Sparkles aria-hidden="true" size={14} />{eyebrow}</p>
          <h1 className="max-w-[470px] font-display text-[clamp(38px,4.4vw,62px)] font-bold leading-[1.05] tracking-[-.055em]">{title}</h1>
          <p className="mt-6 max-w-[410px] text-[15px] leading-7 text-sky-50/70">{description}</p>
        </div>

        <div className="relative z-[1]">
          <div className="mb-4 flex w-fit items-center gap-3 rounded-xl border border-white/15 bg-white/[.04] px-4 py-3.5 backdrop-blur-sm">
            <span className="grid size-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-200"><ShieldCheck aria-hidden="true" size={20} /></span>
            <span className="grid gap-1"><strong className="text-xs font-semibold">Seguridad que acompaña</strong><small className="text-[11px] text-sky-50/60">Sesiones protegidas y control de acceso por rol.</small></span>
          </div>
          <footer className="flex items-center justify-between text-[10px] text-sky-100/45"><span>© 2024 Viamatica</span><span>Privacidad y seguridad</span></footer>
        </div>
      </aside>

      <section aria-label="Acceso a la aplicación" className="flex min-h-dvh flex-col justify-between px-5 py-5 sm:px-8 sm:py-7 lg:px-[clamp(28px,6vw,88px)]">
        <header className="min-[780px]:invisible"><BrandLockup /></header>
        <div className="mx-auto my-12 w-full max-w-[420px] min-[780px]:my-auto">
          <div className="mb-8 grid size-11 place-items-center rounded-xl border border-sky-100 bg-sky-50 text-brand-600"><LockKeyhole aria-hidden="true" size={20} /></div>
          {children}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 text-[10px] text-muted">
          <span>Acceso monitoreado</span><span className="flex items-center gap-2"><i aria-hidden="true" className="size-1.5 rounded-full bg-teal-600" />Sesión protegida</span>
        </footer>
      </section>
    </main>
  )
}
