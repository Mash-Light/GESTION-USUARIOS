import { useMemo, useState } from 'react'
import PeopleManagementPage from '../people/PeopleManagementPage.jsx'
import DashboardPage from '../dashboard/DashboardPage.jsx'
import './Workspace.css'

const routeLabels = {
  dashboard: 'Resumen',
  'users.index': 'Personas y cuentas',
  'imports.create': 'Carga masiva',
  welcome: 'Mi espacio',
}

function DefaultPage({ route, user }) {
  const title = routeLabels[route] ?? 'Mi espacio'
  return (
    <section className="workspace-placeholder" aria-labelledby="workspace-page-title">
      <p className="workspace-eyebrow">GESTIÓN DE USUARIOS</p>
      <h1 id="workspace-page-title">Hola, {user.name ?? user.username}</h1>
      <p>{title === 'Mi espacio'
        ? 'Tu sesión está activa. Aquí encontrarás tus datos y accesos asignados.'
        : `${title} formará parte del siguiente módulo de la aplicación.`}</p>
    </section>
  )
}

export default function Workspace({ navigation, onLogout, user }) {
  const defaultRoute = useMemo(() => navigation.find((item) => item.route_name === 'users.index')?.route_name
    ?? navigation.find((item) => item.route_name === 'welcome')?.route_name
    ?? navigation[0]?.route_name
    ?? 'welcome', [navigation])
  const [selectedRoute, setSelectedRoute] = useState(null)
  const activeRoute = selectedRoute ?? defaultRoute
  const [logoutError, setLogoutError] = useState('')

  async function handleLogout() {
    try {
      await onLogout()
    } catch (error) {
      setLogoutError(error.message)
    }
  }

  return (
    <div className="workspace-layout">
      <aside className="workspace-sidebar" aria-label="Navegación principal">
        <a className="workspace-brand" href="#inicio" onClick={() => setSelectedRoute(defaultRoute)}>
          <span className="workspace-brand-mark" aria-hidden="true">G</span>
          <span>Gestión<span className="workspace-brand-light"> de usuarios</span></span>
        </a>

        <div className="workspace-sidebar-label">ESPACIO DE TRABAJO</div>
        <nav className="workspace-nav" aria-label="Módulos disponibles">
          {navigation.map((item) => (
            <button
              aria-current={activeRoute === item.route_name ? 'page' : undefined}
              className={`workspace-nav-item${activeRoute === item.route_name ? ' is-active' : ''}`}
              key={`${item.route_name}-${item.label}`}
              onClick={() => setSelectedRoute(item.route_name)}
              type="button"
            >
              <span className="workspace-nav-mark" aria-hidden="true">{item.icon_key === 'dashboard.view' ? '◫' : item.icon_key === 'imports.manage' ? '↥' : item.icon_key === 'profile.view' ? '⌂' : '◎'}</span>
              {item.label}
            </button>
          ))}
          {navigation.length === 0 && <p className="workspace-nav-empty">No hay módulos disponibles para esta cuenta.</p>}
        </nav>

        <div className="workspace-sidebar-bottom">
          <div className="workspace-user-card">
            <span className="workspace-avatar" aria-hidden="true">{(user.name ?? user.username).slice(0, 1).toUpperCase()}</span>
            <span className="workspace-user-copy"><strong>{user.name ?? user.username}</strong><small>{user.roles?.[0] === 'admin' ? 'Administrador' : 'Usuario'}</small></span>
          </div>
          <button className="workspace-logout" onClick={handleLogout} type="button">
            <span aria-hidden="true">↗</span> Cerrar sesión
          </button>
          {logoutError && <p className="workspace-error" role="alert">{logoutError}</p>}
        </div>
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          <span>Portal de administración</span>
          <span className="workspace-session"><i aria-hidden="true" /> Sesión protegida</span>
        </header>
        {activeRoute === 'users.index' && user.permissions?.includes('people.manage')
          ? <PeopleManagementPage user={user} />
          : activeRoute === 'dashboard' && user.permissions?.includes('dashboard.view')
            ? <DashboardPage user={user} />
            : <DefaultPage route={activeRoute} user={user} />}
      </main>
    </div>
  )
}
