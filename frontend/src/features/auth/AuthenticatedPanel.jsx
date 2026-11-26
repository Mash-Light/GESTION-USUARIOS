export default function AuthenticatedPanel({ user, onLogout }) {
  return (
    <section className="authenticated-card" aria-labelledby="welcome-title">
      <div className="success-mark" aria-hidden="true">✓</div>
      <p className="eyebrow">SESIÓN ACTIVA</p>
      <h2 id="welcome-title">Hola, {user?.name ?? user?.username ?? 'usuario'}</h2>
      <p>La API confirmó tu sesión. El área de trabajo se habilitará al completar los módulos de usuarios y permisos.</p>
      <button className="submit-button" onClick={onLogout} type="button">Cerrar sesión</button>
    </section>
  )
}
