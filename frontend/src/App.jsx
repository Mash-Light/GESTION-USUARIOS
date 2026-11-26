import { useEffect, useState } from 'react'
import './App.css'
import { currentUser, logout } from './features/auth/authService.js'
import AuthenticatedPanel from './features/auth/AuthenticatedPanel.jsx'
import LoginPage from './features/auth/LoginPage.jsx'
import BrandMark from './shared/components/BrandMark.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [logoutError, setLogoutError] = useState('')
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let mounted = true

    currentUser()
      .then((current) => { if (mounted) setUser(current) })
      .catch(() => { if (mounted) setUser(null) })
      .finally(() => { if (mounted) setCheckingSession(false) })

    return () => { mounted = false }
  }, [])

  async function handleLogout() {
    setLogoutError('')

    try {
      await logout()
      setUser(null)
    } catch (error) {
      setLogoutError(error.message)
    }
  }

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

        <div className="form-content">
          {checkingSession
            ? <p className="session-checking" role="status">Verificando tu sesión…</p>
            : user
            ? <AuthenticatedPanel onLogout={handleLogout} user={user} />
            : <LoginPage onAuthenticated={setUser} />}
          {logoutError && <p className="form-message form-message-error" role="alert">{logoutError}</p>}
        </div>

        <footer className="form-panel-footer">
          <span>Acceso monitoreado</span>
          <span><i aria-hidden="true" />Sesión protegida</span>
        </footer>
      </section>
    </main>
  )
}
