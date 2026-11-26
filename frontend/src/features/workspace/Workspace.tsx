import { useEffect, useRef, useState } from 'react'
import { lazy, Suspense } from 'react'
import type { MouseEvent } from 'react'
import { Activity, ArrowRightFromLine, ChevronDown, CircleHelp, Fingerprint, Home, LayoutDashboard, Menu, ShieldCheck, UploadCloud, UsersRound, X } from 'lucide-react'
import { BrandLockup } from '../../shared/components/BrandMark'
import type { AuthUser, NavigationItem } from '../auth/auth.types'

const PeopleManagementPage = lazy(() => import('../people/PeopleManagementPage'))
const DashboardPage = lazy(() => import('../dashboard/DashboardPage'))
const ImportPage = lazy(() => import('../imports/ImportPage'))
const ProfilePage = lazy(() => import('./ProfilePage'))

const iconByKey: Record<string, typeof LayoutDashboard> = {
  'dashboard.view': LayoutDashboard,
  'users.manage': UsersRound,
  'imports.manage': UploadCloud,
  'profile.view': Home,
}

const routeLabels: Record<string, string> = {
  dashboard: 'Indicadores',
  'users.index': 'Usuarios',
  'imports.create': 'Carga masiva',
  welcome: 'Bienvenida',
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'G'
}

function SidebarContent({ activeRoute, defaultRoute, isMobile, navigation, onClose, onLogout, onSelectRoute, logoutError, roleLabel, user }: { activeRoute: string; defaultRoute: string; isMobile: boolean; navigation: NavigationItem[]; onClose: () => void; onLogout: () => void; onSelectRoute: (route: string) => void; logoutError: string; roleLabel: string; user: AuthUser }) {
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-5">
      <div className="flex items-center justify-between px-3 pb-6">
        <a aria-label="Ir al inicio" className="min-w-0 no-underline" href="#inicio" onClick={() => onSelectRoute(defaultRoute)}><BrandLockup /></a>
        {isMobile && <button aria-label="Cerrar menú" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-slate-50" onClick={onClose} type="button"><X size={18} /></button>}
      </div>
      <div className="flex min-h-[58px] items-center gap-2.5 rounded-xl border border-line bg-canvas/60 px-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-100 font-display text-sm font-bold text-brand-700">V</span>
        <span className="min-w-0 flex-1"><strong className="block truncate text-[11px] font-semibold text-ink-soft">Viamatica</strong><small className="mt-1 block truncate text-[9px] text-muted">Gestión de usuarios</small></span>
        <ChevronDown aria-hidden="true" className="shrink-0 text-slate-400" size={15} />
      </div>
      <p className="mb-2 mt-7 px-3 text-[9px] font-bold uppercase tracking-[.16em] text-slate-400">Espacio de trabajo</p>
      <nav aria-label="Módulos disponibles" className="grid gap-1">
        {navigation.map((item) => {
          const Icon = iconByKey[item.icon_key] ?? Activity
          const active = activeRoute === item.route_name
          return (
            <button aria-current={active ? 'page' : undefined} className={`group relative flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-left text-xs font-semibold transition-colors ${active ? 'bg-sky-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50 hover:text-ink-soft'}`} key={`${item.route_name}-${item.label}`} onClick={() => onSelectRoute(item.route_name)} type="button">
              {active && <span aria-hidden="true" className="absolute -left-4 h-5 w-[3px] rounded-r-full bg-brand-600" />}
              <Icon aria-hidden="true" className={active ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-600'} size={18} /><span>{item.label}</span>
            </button>
          )
        })}
        {navigation.length === 0 && <p className="px-3 py-2 text-xs leading-5 text-muted">No hay módulos disponibles para esta cuenta.</p>}
      </nav>
      <div className="mt-auto">
        <div className="mb-3 flex items-center gap-2.5 rounded-lg bg-teal-50 px-2.5 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-100 text-teal-700"><Fingerprint aria-hidden="true" size={17} /></span>
          <span className="min-w-0 flex-1"><strong className="block text-[10px] font-bold text-teal-800">Cuenta protegida</strong><small className="mt-1 block truncate text-[9px] text-teal-700/70">Sesión única verificada</small></span>
          <ShieldCheck aria-hidden="true" className="text-teal-600" size={16} />
        </div>
        <div className="flex items-center gap-2.5 border-t border-slate-100 px-2 py-3">
          <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[10px] font-bold text-brand-700">{initials(user.name ?? user.username)}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-[10px] font-semibold text-ink-soft">{user.name ?? user.username}</strong><small className="mt-1 block text-[9px] text-muted">{roleLabel}</small></span>
        </div>
        <button className="flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[11px] font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700" onClick={onLogout} type="button"><ArrowRightFromLine aria-hidden="true" size={16} />Cerrar sesión</button>
        {logoutError && <p className="px-2.5 pt-2 text-[11px] text-red-700" role="alert">{logoutError}</p>}
      </div>
    </div>
  )
}

function DefaultPage({ route, user }: { route: string; user: AuthUser }) {
  const title = routeLabels[route] ?? 'Mi espacio'
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:px-12" aria-labelledby="workspace-page-title">
      <p className="ui-eyebrow">GESTIÓN DE USUARIOS</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink" id="workspace-page-title">Hola, {user.name ?? user.username}</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{title} estará disponible en una próxima actualización.</p>
    </section>
  )
}

export default function Workspace({ activeRoute: route, navigation, onLogout, onNavigate, onUserUpdated, user }: { activeRoute: string; navigation: NavigationItem[]; onLogout: () => Promise<void>; onNavigate: (route: string) => void; onUserUpdated: (user: AuthUser) => void; user: AuthUser }) {
  const defaultRoute = navigation.find((item) => item.route_name === 'dashboard')?.route_name
    ?? navigation.find((item) => item.route_name === 'users.index')?.route_name
    ?? navigation.find((item) => item.route_name === 'welcome')?.route_name
    ?? navigation[0]?.route_name
    ?? 'welcome'
  const [menuOpen, setMenuOpen] = useState(false)
  const [isNarrow, setIsNarrow] = useState(() => window.matchMedia('(max-width: 779px)').matches)
  const [logoutError, setLogoutError] = useState('')
  const mobileDialogRef = useRef<HTMLDialogElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const activeRoute = route ?? defaultRoute
  const activeLabel = navigation.find((item) => item.route_name === activeRoute)?.label ?? routeLabels[activeRoute] ?? 'Espacio de trabajo'
  const roleLabel = user.roles?.[0] === 'admin' ? 'Administrador' : 'Usuario'

  useEffect(() => {
    const media = window.matchMedia('(max-width: 779px)')
    const update = (event: MediaQueryListEvent) => setIsNarrow(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    const dialog = mobileDialogRef.current
    if (!dialog) return
    if (isNarrow && menuOpen && !dialog.open) dialog.showModal()
    if ((!isNarrow || !menuOpen) && dialog.open) dialog.close()
  }, [isNarrow, menuOpen])

  async function handleLogout() {
    try {
      await onLogout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.')
    }
  }

  function selectRoute(route: string) {
    onNavigate(route)
    setMenuOpen(false)
  }

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <aside aria-label="Navegación principal" className="fixed inset-y-0 left-0 z-10 hidden w-[250px] border-r border-line bg-white min-[780px]:block">
          <SidebarContent activeRoute={activeRoute} defaultRoute={defaultRoute} isMobile={false} navigation={navigation} onClose={() => {}} onLogout={handleLogout} onSelectRoute={selectRoute} logoutError={logoutError} roleLabel={roleLabel} user={user} />
      </aside>

      <dialog aria-label="Navegación principal" className="mobile-navigation fixed inset-0 m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-transparent p-0 min-[780px]:hidden" id="mobile-navigation" onClose={() => setMenuOpen(false)} onClick={(event: MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) setMenuOpen(false) }} ref={mobileDialogRef}>
        <aside className="h-full w-[250px] max-w-[85vw] border-r border-line bg-white shadow-2xl">
          <SidebarContent activeRoute={activeRoute} defaultRoute={defaultRoute} isMobile navigation={navigation} onClose={() => setMenuOpen(false)} onLogout={handleLogout} onSelectRoute={selectRoute} logoutError={logoutError} roleLabel={roleLabel} user={user} />
        </aside>
      </dialog>

      <div className="min-[780px]:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-[65px] items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-md sm:px-7 lg:h-[76px] lg:px-12">
          <div className="flex min-w-0 items-center gap-2.5">
            <button aria-controls="mobile-navigation" aria-expanded={menuOpen} aria-label="Abrir menú" className="grid size-9 place-items-center rounded-lg text-ink-soft hover:bg-slate-50 min-[780px]:hidden" onClick={() => setMenuOpen(true)} ref={menuButtonRef} type="button"><Menu aria-hidden="true" size={20} /></button>
            <div className="flex min-w-0 items-center gap-2 text-[11px] text-slate-400"><span className="hidden sm:inline">Espacio de trabajo</span><ChevronDown aria-hidden="true" className="hidden -rotate-90 sm:block" size={13} /><strong className="truncate font-semibold text-ink-soft">{activeLabel}</strong></div>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="hidden items-center gap-2 text-[10px] text-muted sm:flex"><CircleHelp aria-hidden="true" size={16} />Acceso seguro</span>
            <span aria-hidden="true" className="hidden h-7 border-l border-line sm:block" />
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-[10px] font-bold text-brand-700">{initials(user.name ?? user.username)}</span>
            <span className="hidden min-w-0 sm:block"><strong className="block max-w-36 truncate text-[10px] font-semibold text-ink-soft">{user.name ?? user.username}</strong><small className="mt-1 block text-[9px] text-muted">{roleLabel}</small></span>
          </div>
        </header>
        <main className="min-h-[calc(100dvh-65px)] lg:min-h-[calc(100dvh-76px)]">
          <Suspense fallback={<p className="mx-auto mt-8 max-w-6xl px-5 text-sm text-muted" role="status">Cargando sección…</p>}>
          {activeRoute === 'users.index' && user.permissions?.includes('people.manage')
            ? <PeopleManagementPage user={user} />
            : activeRoute === 'dashboard' && user.permissions?.includes('dashboard.view')
              ? <DashboardPage onNavigate={selectRoute} user={user} />
              : activeRoute === 'imports.create' && user.permissions?.includes('imports.manage')
                ? <ImportPage />
                : activeRoute === 'welcome' && user.permissions?.includes('profile.view')
                  ? <ProfilePage onUserUpdated={onUserUpdated} user={user} />
                  : <DefaultPage route={activeRoute} user={user} />}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
