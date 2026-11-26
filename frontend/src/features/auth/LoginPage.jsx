import { useState } from 'react'
import { login, requestPasswordReset } from './authService.js'

export default function LoginPage({ onAuthenticated }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [notice, setNotice] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)

    try {
      if (recovery) {
        await requestPasswordReset(identifier)
        setNotice('Si los datos corresponden a una cuenta, recibirás instrucciones para continuar.')
        return
      }

      onAuthenticated(await login({ login: identifier, password }))
    } catch (requestError) {
      setError(requestError.status === 429
        ? 'Se alcanzó el límite de intentos. Espera un momento antes de volver a intentarlo.'
        : requestError.status === 423
          ? 'La cuenta está bloqueada. Contacta a un administrador para solicitar el desbloqueo.'
          : requestError.status === 409
            ? 'Esta cuenta ya tiene una sesión activa.'
            : requestError.status === 403
              ? 'La cuenta no está habilitada para iniciar sesión.'
          : requestError.message === 'Failed to fetch'
            ? 'No se pudo conectar con la API. Comprueba que el servidor esté iniciado.'
            : requestError.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleRecovery() {
    setRecovery((value) => !value)
    setPassword('')
    setError('')
    setNotice('')
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <p className="eyebrow">{recovery ? 'RECUPERACIÓN DE CUENTA' : 'ACCESO SEGURO'}</p>
        <h2>{recovery ? 'Recupera tu acceso' : 'Inicia sesión'}</h2>
        <p>{recovery ? 'Te enviaremos los siguientes pasos si la cuenta está registrada.' : 'Usa tu correo institucional o tu nombre de usuario.'}</p>
      </div>

      <div className="field-group">
        <label htmlFor="login-identifier">{recovery ? 'Correo electrónico' : 'Correo o usuario'}</label>
        <input
          autoComplete={recovery ? 'email' : 'username'}
          id="login-identifier"
          name="login"
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder={recovery ? 'nombre@dominio.com' : 'Tu correo o nombre de usuario'}
          required
          type={recovery ? 'email' : 'text'}
          value={identifier}
        />
      </div>

      {!recovery && (
        <div className="field-group">
          <div className="field-label-row">
            <label htmlFor="login-password">Contraseña</label>
            <span className="field-hint">Campo privado</span>
          </div>
          <input
            autoComplete="current-password"
            id="login-password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ingresa tu contraseña"
            required
            type="password"
            value={password}
          />
        </div>
      )}

      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      {notice && <p className="form-message form-message-success" role="status">{notice}</p>}

      <button className="submit-button" disabled={loading} type="submit">
        {loading ? 'Procesando…' : recovery ? 'Enviar instrucciones' : 'Entrar a mi cuenta'}
        {!loading && <span aria-hidden="true">↗</span>}
      </button>

      <button className="text-button" disabled={loading} onClick={toggleRecovery} type="button">
        {recovery ? 'Volver al inicio de sesión' : '¿Olvidaste tu contraseña?'}
      </button>
    </form>
  )
}
