import { useState } from 'react'
import { resetPassword } from './authService.js'
import BrandMark from '../../shared/components/BrandMark.jsx'

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (!token || !email) {
      setError('El enlace de recuperación no está completo. Solicita uno nuevo desde el inicio de sesión.')
      return
    }
    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const response = await resetPassword({ token, email, password, password_confirmation: confirmation })
      setSuccess(response.message)
      setPassword('')
      setConfirmation('')
    } catch (requestError) {
      setError(requestError.errors?.password?.[0] ?? requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-layout">
      <aside className="brand-panel" aria-label="Información de la aplicación">
        <div className="brand-lockup"><BrandMark /><span>Gestión de usuarios</span></div>
        <div className="brand-copy"><p className="eyebrow">SEGURIDAD DE CUENTA</p><h1>Recupera el acceso con tranquilidad.</h1><p>El enlace es de un solo uso y caduca. Tu contraseña se valida y protege en el servidor.</p></div>
        <p className="panel-footer">Accesos protegidos para equipos responsables.</p>
      </aside>

      <section className="form-panel" aria-label="Restablecer contraseña">
        <div className="form-panel-top"><BrandMark /><span>Portal de administración</span></div>
        <div className="form-content">
          {success ? (
            <section className="authenticated-card" aria-labelledby="reset-complete-title">
              <div className="success-mark" aria-hidden="true">✓</div>
              <p className="eyebrow">CONTRASEÑA ACTUALIZADA</p>
              <h2 id="reset-complete-title">Ya puedes volver a tu cuenta.</h2>
              <p>{success}</p>
              <a className="submit-button reset-login-link" href="/">Volver al inicio de sesión <span aria-hidden="true">→</span></a>
            </section>
          ) : (
            <form className="login-form" onSubmit={submit}>
              <div className="form-heading"><p className="eyebrow">RECUPERACIÓN DE CUENTA</p><h2>Define una contraseña nueva</h2><p>Usa al menos 10 caracteres, una mayúscula, un número y un símbolo.</p></div>
              <div className="field-group"><label htmlFor="reset-email">Correo electrónico</label><input autoComplete="email" id="reset-email" onChange={(event) => setEmail(event.target.value)} readOnly={Boolean(token)} required type="email" value={email} /></div>
              <div className="field-group"><label htmlFor="reset-password">Nueva contraseña</label><input autoComplete="new-password" id="reset-password" minLength={10} onChange={(event) => setPassword(event.target.value)} pattern="(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{10,}" required title="Debe tener 10 caracteres, una mayúscula, un número y un símbolo." type="password" value={password} /></div>
              <div className="field-group"><label htmlFor="reset-confirmation">Confirma la contraseña</label><input autoComplete="new-password" id="reset-confirmation" onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} /></div>
              {error && <p className="form-message form-message-error" role="alert">{error}</p>}
              <button className="submit-button" disabled={loading} type="submit">{loading ? 'Actualizando…' : 'Guardar contraseña'} {!loading && <span aria-hidden="true">↗</span>}</button>
            </form>
          )}
        </div>
        <footer className="form-panel-footer"><span>Recuperación de acceso</span><span><i aria-hidden="true" />Enlace protegido</span></footer>
      </section>
    </main>
  )
}
