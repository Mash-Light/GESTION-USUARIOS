import { useEffect, useState } from 'react'
import './App.css'
import { currentNavigation, currentUser, logout } from './features/auth/authService.js'
import LoginPage from './features/auth/LoginPage.jsx'
import ResetPasswordPage from './features/auth/ResetPasswordPage.jsx'
import Workspace from './features/workspace/Workspace.jsx'
import BrandMark from './shared/components/BrandMark.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [navigation, setNavigation] = useState([])

  async function activateSession(nextUser) {
    setUser(nextUser)

    try {
      setNavigation(await currentNavigation())
    } catch {
      setNavigation([])
    }
  }

  useEffect(() => {
    if (window.location.pathname === '/reset-password') return undefined

    let mounted = true

    currentUser()
      .then(async (current) => {
        if (!mounted) return
        await activateSession(current)
      })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setCheckingSession(false) })

    return () => { mounted = false }
  }, [])

  if (window.location.pathname === '/reset-password') return <ResetPasswordPage />

  async function handleLogout() {
    await logout()
    setUser(null)
    setNavigation([])
  }

  if (checkingSession) {
    return <main className="session-loading-screen"><p role="status">Verificando tu sesión…</p></main>
  }

  if (user) return <Workspace navigation={navigation} onLogout={handleLogout} onUserUpdated={setUser} user={user} />

  return (
    <main className="auth-layout">
      <aside className="brand-panel" aria-label="Información de la aplicación">
        <div className="brand-lockup">
          <BrandMark />
          <span>Gestión de usuarios</span>
        </div>

        <div className="brand-copy">
          <p className="eyebrow">PERSONAS · CUENTAS · ACCESOS</p>
          <h1>Todo acceso tiene una persona detrás.</h1>
          <p>Administra cuentas con reglas claras, permisos precisos y un historial que puedes explicar.</p>
        </div>

        <div className="security-note">
          <span className="security-icon" aria-hidden="true">⌑</span>
          <div>
            <strong>Sesiones protegidas</strong>
            <p>La autenticación se valida en el servidor.</p>
          </div>
        </div>

        <p className="panel-footer">Un espacio de trabajo para equipos responsables.</p>
      </aside>

      <section className="form-panel" aria-label="Acceso a la aplicación">
        <div className="form-panel-top">
          <BrandMark />
          <span>Portal de administración</span>
        </div>

        <div className="form-content"><LoginPage onAuthenticated={activateSession} /></div>

        <footer className="form-panel-footer">
          <span>Acceso monitoreado</span>
          <span><i aria-hidden="true" />Sesión protegida</span>
        </footer>
      </section>
    </main>
  )
}
