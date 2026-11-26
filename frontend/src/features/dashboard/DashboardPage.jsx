import { useEffect, useState } from 'react'
import { getDashboardSummary } from './dashboardService.js'
import './DashboardPage.css'

const number = new Intl.NumberFormat('es-EC')

const eventLabels = {
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'auth.login_locked': 'Cuenta bloqueada',
  'people.created': 'Cuenta creada',
  'people.updated': 'Cuenta actualizada',
  'people.deleted': 'Cuenta desactivada',
  'people.unlocked': 'Cuenta desbloqueada',
}

function Metric({ label, value, detail, symbol }) {
  return (
    <article className="dashboard-metric">
      <div className="dashboard-metric-top"><span>{label}</span><span aria-hidden="true">{symbol}</span></div>
      <strong>{number.format(value)}</strong>
      <small>{detail}</small>
    </article>
  )
}

export default function DashboardPage({ user }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    getDashboardSummary(controller.signal)
      .then(setSummary)
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })

    return () => controller.abort()
  }, [])

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-title">
      <header className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">CENTRO DE CONTROL · SEGURIDAD</p>
          <h1 id="dashboard-title">Resumen</h1>
          <p>Hola, {user.name ?? user.username}. Este es el estado actual de las cuentas y accesos.</p>
        </div>
        {summary && <span className="dashboard-updated">Actualizado {new Date(summary.generated_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>}
      </header>

      {error && <p className="dashboard-error" role="alert">{error}</p>}
      {!summary && !error && <p className="dashboard-loading" role="status">Cargando indicadores de seguridad…</p>}
      {summary && (
        <>
          <div className="dashboard-metrics">
            <Metric label="Cuentas registradas" value={summary.accounts.total} detail="Cuentas no eliminadas" symbol="◎" />
            <Metric label="Cuentas activas" value={summary.accounts.active} detail="Habilitadas y sin bloqueo" symbol="↗" />
            <Metric label="Sesiones vigentes" value={summary.active_sessions} detail="Accesos con sesión válida" symbol="◉" />
            <Metric label="Intentos fallidos" value={summary.failed_attempts_24h} detail="Últimas 24 horas" symbol="⌁" />
          </div>

          <section className="dashboard-activity" aria-labelledby="dashboard-activity-title">
            <header><div><p className="dashboard-eyebrow">TRAZABILIDAD</p><h2 id="dashboard-activity-title">Actividad reciente</h2></div><span>Últimos 5 eventos</span></header>
            {summary.recent_events.length === 0
              ? <p className="dashboard-empty">Aún no hay actividad registrada.</p>
              : <ol>{summary.recent_events.map((event, index) => (
                <li key={`${event.event}-${event.occurred_at}-${index}`}>
                  <span className={`dashboard-event-mark${event.result === 'failed' ? ' is-failed' : ''}`} aria-hidden="true">{event.result === 'failed' ? '!' : '✓'}</span>
                  <span className="dashboard-event-copy"><strong>{eventLabels[event.event] ?? 'Actividad de cuenta'}</strong><small>{event.event}</small></span>
                  <span className={`dashboard-event-result${event.result === 'failed' ? ' is-failed' : ''}`}>{event.result === 'failed' ? 'Fallido' : 'Correcto'}</span>
                  <time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' })}</time>
                </li>
              ))}</ol>}
          </section>
        </>
      )}
    </section>
  )
}
