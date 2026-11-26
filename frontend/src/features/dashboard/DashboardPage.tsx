import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, Clock3, RefreshCw, ShieldAlert, UsersRound } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { getDashboardSummary } from './dashboardService'
import type { DashboardDay, DashboardRecentUser } from './dashboard.types'
import type { AuthUser } from '../auth/auth.types'
import type { LucideIcon } from 'lucide-react'

const number = new Intl.NumberFormat('es-EC')
const dateFormat = new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' })

const iconTones = {
  blue: 'bg-sky-100 text-brand-600',
  green: 'bg-teal-100 text-teal-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
}

function Metric({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: LucideIcon; tone: keyof typeof iconTones }) {
  return (
    <article className="ui-card grid min-w-0 gap-3.5 p-4 sm:p-[18px]">
      <span className={`grid size-9 place-items-center rounded-[9px] ${iconTones[tone]}`}><Icon aria-hidden="true" size={19} /></span>
      <div className="flex min-h-7 items-start justify-between gap-2 text-[10px] text-muted"><span>{label}</span><ArrowUpRight aria-hidden="true" className="shrink-0 text-slate-300" size={15} /></div>
      <strong className="font-display text-[clamp(23px,2vw,29px)] font-bold leading-none tracking-[-.045em] text-ink-soft">{number.format(value)}</strong>
      <small className="text-[9px] leading-4 text-slate-400">{detail}</small>
    </article>
  )
}

function ActivityChart({ days }: { days: DashboardDay[] }) {
  const total = days.reduce((sum, day) => sum + day.successful + day.failed, 0)

  return (
    <article className="ui-card min-w-0 p-4 sm:p-[22px]">
      <header className="flex items-start justify-between gap-3">
        <div><p className="ui-eyebrow mb-1.5">ÚLTIMOS 7 DÍAS</p><h2 className="font-display text-[17px] font-bold tracking-[-.035em] text-ink-soft">Actividad de sesiones</h2></div>
        <span className="rounded-lg border border-line px-2.5 py-2 text-[9px] font-semibold text-muted">Esta semana <Clock3 aria-hidden="true" className="ml-1 inline" size={13} /></span>
      </header>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <strong className="font-display text-[27px] font-bold tracking-[-.04em] text-ink-soft">{number.format(total)}</strong>
        <span className="text-[10px] text-muted">inicios de sesión</span>
      </div>
      <div aria-label="Inicios de sesión en los últimos siete días" className="relative mt-2 h-[205px]" role="group">
        {total > 0 ? <ResponsiveContainer height="100%" width="100%">
          <AreaChart accessibilityLayer data={days} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs><linearGradient id="successfulSessions" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#149bcf" stopOpacity={0.2} /><stop offset="100%" stopColor="#149bcf" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="#eaf0f3" strokeDasharray="4 5" vertical={false} />
            <XAxis axisLine={false} dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} tickMargin={10} />
            <YAxis allowDecimals={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickLine={false} width={32} />
            <Tooltip contentStyle={{ border: '1px solid #e6ebed', borderRadius: 10, fontSize: 12 }} />
            <Area dataKey="successful" fill="url(#successfulSessions)" name="Correctos" stroke="#149bcf" strokeWidth={3} type="monotone" />
            <Area dataKey="failed" fill="transparent" name="Fallidos" stroke="#f0a17e" strokeDasharray="5 6" strokeWidth={2} type="monotone" />
          </AreaChart>
        </ResponsiveContainer> : <p className="grid h-full place-items-center text-center text-xs text-muted">Sin inicios de sesión durante este periodo.</p>}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 text-[9px] text-muted"><span className="inline-flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-brand-600" />Correctos</span><span className="inline-flex items-center gap-1.5"><i className="size-1.5 rounded-full bg-orange-300" />Fallidos</span></div>
    </article>
  )
}

function AccessSummary({ days }: { days: DashboardDay[] }) {
  const totals = days.reduce((sum, day) => ({ successful: sum.successful + day.successful, failed: sum.failed + day.failed }), { successful: 0, failed: 0 })
  const total = totals.successful + totals.failed
  const ratio = total > 0 ? Math.round((totals.successful / total) * 1000) / 10 : null
  const angle = total > 0 ? (totals.successful / total) * 360 : 0

  return (
    <article className="ui-card flex min-h-[320px] flex-col p-4 sm:min-h-[365px] sm:p-[22px]">
      <header><p className="ui-eyebrow mb-1.5">MONITOREO</p><h2 className="font-display text-[17px] font-bold tracking-[-.035em] text-ink-soft">Resumen de acceso</h2></header>
      <div aria-label={ratio === null ? 'No hay inicios de sesión en los últimos siete días' : `${ratio}% de inicios de sesión correctos en los últimos siete días`} className="relative mx-auto my-5 grid size-40 shrink-0 place-items-center rounded-full sm:size-44" role="img" style={{ background: total > 0 ? `conic-gradient(#18ad99 0deg ${angle}deg, #f2a17e ${angle}deg 360deg)` : '#e4edf1' }}>
        <div className="absolute inset-[13px] rounded-full bg-white" />
        <span className="relative z-[1] text-center"><strong className="block font-display text-[27px] font-bold tracking-[-.06em] text-ink-soft">{ratio === null ? '—' : `${ratio}%`}</strong><small className="text-[10px] text-muted">correctos</small></span>
      </div>
      <div className="grid gap-2.5">
        <div className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[10px] text-muted"><i className="size-1.5 rounded-full bg-teal-500" />Inicios correctos<strong className="text-ink-soft">{number.format(totals.successful)}</strong></div>
        <div className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[10px] text-muted"><i className="size-1.5 rounded-full bg-orange-300" />Intentos fallidos<strong className="text-ink-soft">{number.format(totals.failed)}</strong></div>
      </div>
      <span className="mt-auto pt-4 text-center text-[9px] text-slate-400">Datos reales de los últimos 7 días</span>
    </article>
  )
}

function displayRole(role: string) {
  return role === 'admin' ? 'Administrador' : 'Usuario'
}

function displayStatus(user: DashboardRecentUser) {
  if (user.locked) return { label: 'Bloqueado', style: 'bg-red-50 text-red-700', icon: ShieldAlert }
  if (user.status !== 'active') return { label: 'Inactivo', style: 'bg-slate-100 text-slate-600', icon: ArrowDownRight }
  return { label: 'Activo', style: 'bg-teal-50 text-teal-700', icon: CheckCircle2 }
}

function RecentUsers({ users, canManage, onNavigate }: { users: DashboardRecentUser[]; canManage: boolean; onNavigate: (route: string) => void }) {
  return (
    <section className="ui-card mt-4 overflow-hidden p-4 sm:p-[22px]" aria-labelledby="recent-users-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="ui-eyebrow mb-1.5">DIRECTORIO</p><h2 className="font-display text-[17px] font-bold tracking-[-.035em] text-ink-soft" id="recent-users-title">Usuarios recientes</h2><p className="mt-1.5 text-[11px] text-muted">Cuentas con actividad más reciente en el sistema.</p></div>
        {canManage && <button className="ui-button ui-button-primary" onClick={() => onNavigate('users.index')} type="button"><UsersRound aria-hidden="true" size={16} /> Ver usuarios <ArrowRight aria-hidden="true" size={14} /></button>}
      </header>
      <div className="mt-5 overflow-x-auto border-y border-slate-100">
        <table className="w-full min-w-[650px] border-collapse text-left">
          <thead><tr className="text-[9px] font-bold uppercase tracking-[.08em] text-slate-400"><th className="px-2.5 py-3">Usuario</th><th className="px-2.5 py-3">Rol</th><th className="px-2.5 py-3">Último acceso</th><th className="px-2.5 py-3">Estado</th></tr></thead>
          <tbody>
            {users.map((item, index) => {
              const status = displayStatus(item)
              const StatusIcon = status.icon
              const initials = item.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
              const avatar = ['bg-sky-100 text-sky-700', 'bg-teal-50 text-teal-700', 'bg-orange-50 text-orange-700', 'bg-indigo-50 text-indigo-700', 'bg-cyan-50 text-cyan-700'][index % 5]
              return <tr className="border-t border-slate-100 text-[10px] text-slate-600 hover:bg-canvas/70" key={item.id}>
                <td className="px-2.5 py-2.5"><span className="flex min-w-0 items-center gap-2.5"><span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-lg text-[9px] font-extrabold ${avatar}`}>{initials}</span><span className="min-w-0"><strong className="block max-w-[210px] truncate text-[10px] font-semibold text-ink-soft">{item.name}</strong><small className="mt-1 block max-w-[210px] truncate text-[9px] text-slate-400">{item.email}</small></span></span></td>
                <td className="px-2.5 py-2.5">{displayRole(item.role)}</td>
                <td className="px-2.5 py-2.5"><span className="inline-flex items-center gap-1.5 text-slate-500">{item.last_login_at && <Clock3 aria-hidden="true" size={13} />}{item.last_login_at ? dateFormat.format(new Date(item.last_login_at)) : 'Sin ingresos'}</span></td>
                <td className="px-2.5 py-2.5"><span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[9px] font-bold ${status.style}`}><StatusIcon aria-hidden="true" size={12} />{status.label}</span></td>
              </tr>
            })}
            {users.length === 0 && <tr><td className="px-3 py-10 text-center text-xs text-muted" colSpan={4}>Aún no hay cuentas registradas.</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="mt-3 flex items-center justify-between gap-3 text-[9px] text-slate-400"><span>Mostrando <strong className="text-slate-600">{users.length}</strong> cuentas recientes</span>{canManage && <button className="font-semibold text-brand-700 hover:underline" onClick={() => onNavigate('users.index')} type="button">Abrir directorio completo <ArrowRight aria-hidden="true" className="ml-1 inline" size={13} /></button>}</footer>
    </section>
  )
}

export default function DashboardPage({ onNavigate, user }: { onNavigate: (route: string) => void; user: AuthUser }) {
  const { data: summary, error, isLoading: loading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: ({ signal }) => getDashboardSummary(signal),
  })

  const activity = summary?.activity_by_day ?? []
  const adminName = user.name?.split(/\s+/).filter(Boolean)[0] ?? user.username
  const today = summary ? new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(summary.generated_at)) : ''
  const greeting = today ? `${today.charAt(0).toLocaleUpperCase('es-EC')}${today.slice(1)}` : 'Panel de administración'
  const canManage = Boolean(user.permissions?.includes('people.manage'))

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 pb-7 pt-7 sm:px-7 lg:px-12 lg:pt-10">
      <header className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="ui-eyebrow mb-2">{greeting}</p><h1 className="font-display text-[clamp(26px,3vw,36px)] font-bold leading-tight tracking-[-.055em] text-ink">Buenos días, {adminName} <span aria-hidden="true" className="text-brand-500">✦</span></h1><p className="mt-2 max-w-xl text-[12px] leading-5 text-muted">Aquí tienes el estado real de las personas, cuentas y accesos del sistema.</p></div>
      <button className="ui-button ui-button-secondary w-full sm:w-auto" disabled={isFetching} onClick={() => refetch()} type="button"><RefreshCw aria-hidden="true" className={isFetching ? 'animate-spin' : ''} size={15} />Actualizar datos</button>
      </header>

      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-cyan-100 bg-gradient-to-r from-cyan-50 to-sky-50/50 px-4 py-3.5 sm:flex-nowrap" aria-label="Estado de seguridad">
        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-cyan-100 text-brand-700"><Activity aria-hidden="true" size={19} /></span>
        <div className="min-w-0 flex-1"><strong className="text-xs font-bold text-teal-800">Acceso centralizado y protegido</strong><p className="mt-1 text-[10px] leading-4 text-slate-500">Las sesiones y permisos se comprueban en el servidor. {number.format(summary?.accounts.active ?? 0)} cuentas están habilitadas actualmente.</p></div>
        {canManage && <button className="ml-12 inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-brand-700 hover:underline sm:ml-0" onClick={() => onNavigate('users.index')} type="button">Ver directorio <ArrowRight aria-hidden="true" size={14} /></button>}
      </section>

      {error && <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-800" role="alert">{error.message}</p>}
      {loading && !summary && !error && <p className="mt-5 rounded-xl border border-line bg-white p-5 text-sm text-muted" role="status">Cargando indicadores de seguridad…</p>}
      {summary && (
        <>
          <section aria-label="Indicadores principales" className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
            <Metric detail="Cuentas no eliminadas" icon={UsersRound} label="Usuarios registrados" tone="blue" value={summary.accounts.total} />
            <Metric detail="Habilitadas y sin bloqueo" icon={CheckCircle2} label="Cuentas activas" tone="green" value={summary.accounts.active} />
            <Metric detail="Accesos con sesión vigente" icon={Activity} label="Sesiones activas" tone="orange" value={summary.active_sessions} />
            <Metric detail="Intentos de las últimas 24 h" icon={ShieldAlert} label="Intentos fallidos" tone="red" value={summary.failed_attempts_24h} />
          </section>

          <section className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(295px,.9fr)]" aria-label="Análisis de accesos">
            <ActivityChart days={activity} />
            <AccessSummary days={activity} />
          </section>

          <RecentUsers canManage={canManage} onNavigate={onNavigate} users={summary.recent_users ?? []} />
          <footer className="mt-5 flex flex-col justify-between gap-2 text-[9px] text-slate-400 sm:flex-row"><span>Gestión de usuarios <b className="mx-1 text-slate-300">·</b> Panel de administración</span><span className="inline-flex items-center gap-1.5"><Clock3 aria-hidden="true" size={13} />Actualizado {new Date(summary.generated_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span></footer>
        </>
      )}

      {!summary && error && <div className="mt-5 rounded-xl border border-line bg-white p-5 text-sm text-muted">No se pudieron cargar los indicadores. Comprueba la conexión e inténtalo de nuevo. <button className="ml-2 font-semibold text-brand-700 underline" onClick={() => refetch()} type="button">Reintentar</button></div>}
    </div>
  )
}
