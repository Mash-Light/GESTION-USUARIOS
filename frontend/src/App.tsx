import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { currentNavigation, currentUser, logout } from './features/auth/authService'
import AuthShell from './features/auth/AuthShell'
import LoginPage from './features/auth/LoginPage'
import ResetPasswordPage from './features/auth/ResetPasswordPage'
import Workspace from './features/workspace/Workspace'
import type { AuthUser, NavigationItem } from './features/auth/auth.types'

const routePath: Record<string, string> = {
  dashboard: '/dashboard',
  'users.index': '/users',
  'imports.create': '/imports',
  welcome: '/welcome',
}

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [navigation, setNavigation] = useState<NavigationItem[]>([])
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  async function activateSession(nextUser: AuthUser): Promise<NavigationItem[]> {
    setUser(nextUser)

    try {
      const items = await currentNavigation()
      setNavigation(items)
      return items
    } catch {
      setNavigation([])
      return []
    }
  }

  useEffect(() => {
    let mounted = true

    currentUser()
      .then(async (current) => {
        if (!mounted || !current) return
        await activateSession(current)
      })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setCheckingSession(false) })

    return () => { mounted = false }
  }, [])

  if (location.pathname === '/reset-password') return <ResetPasswordPage />

  async function handleLogout() {
    await logout()
    queryClient.clear()
    setUser(null)
    setNavigation([])
  }

  if (checkingSession) {
    return <main className="grid min-h-dvh place-items-center bg-canvas text-sm text-muted"><p aria-live="polite" role="status">Verificando tu sesión…</p></main>
  }

  if (user) {
    const permittedDefault = navigation.find((item) => item.route_name === 'dashboard')?.route_name
      ?? navigation.find((item) => item.route_name === 'users.index')?.route_name
      ?? navigation.find((item) => item.route_name === 'welcome')?.route_name
      ?? navigation[0]?.route_name
      ?? 'welcome'
    const defaultPath = routePath[permittedDefault] ?? '/welcome'
    const workspace = (route: string) => <Workspace activeRoute={route} navigation={navigation} onLogout={handleLogout} onNavigate={(nextRoute) => navigate(routePath[nextRoute] ?? defaultPath)} onUserUpdated={setUser} user={user} />

    return (
      <Routes>
        <Route element={<Navigate replace to={defaultPath} />} path="/" />
        {navigation.map((item) => routePath[item.route_name] ? <Route element={workspace(item.route_name)} key={item.route_name} path={routePath[item.route_name]} /> : null)}
        <Route element={<Navigate replace to={defaultPath} />} path="*" />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route element={<AuthShell
        description="Administra accesos, personas y operaciones desde un solo lugar. Diseñado para que cada decisión sea más clara."
        eyebrow="PLATAFORMA DE GESTIÓN"
        title={<>Todo tu equipo,<br /><span className="text-cyan-300">en movimiento.</span></>}
      >
        <LoginPage onAuthenticated={async (nextUser) => {
          queryClient.clear()
          const items = await activateSession(nextUser)
          const destination = items.find((item) => item.route_name === 'dashboard')?.route_name
            ?? items.find((item) => item.route_name === 'users.index')?.route_name
            ?? items[0]?.route_name
            ?? 'welcome'
          navigate(routePath[destination] ?? '/welcome', { replace: true })
        }} />
      </AuthShell>} path="/" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}
