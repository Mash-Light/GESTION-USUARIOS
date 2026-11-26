import { useState } from 'react'
import { request } from '../../shared/api/httpClient.js'
import './ProfilePage.css'

const fields = [
  ['first_name', 'Primer nombre'], ['middle_names', 'Otros nombres'],
  ['first_surname', 'Primer apellido'], ['second_surname', 'Segundo apellido'],
]

function dateLabel(value) {
  return value ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Aún no registra ingresos'
}

export default function ProfilePage({ user, onUserUpdated }) {
  const [form, setForm] = useState({ ...user.profile, birth_date: user.profile?.birth_date ?? '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const editable = user.permissions?.includes('profile.update-own')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setNotice('')
    setError('')
    setFieldErrors({})
    try {
      const editableData = Object.fromEntries([...fields.map(([name]) => name), 'birth_date'].map((name) => [name, form[name] ?? '']))
      const response = await request('/api/profile', { method: 'PATCH', body: JSON.stringify(editableData) })
      onUserUpdated(response.data.user)
      setForm({ ...response.data.user.profile, birth_date: response.data.user.profile.birth_date ?? '' })
      setNotice('Tus datos se actualizaron correctamente.')
    } catch (requestError) {
      setError(requestError.status === 422 ? 'Revisa los campos señalados.' : requestError.message)
      setFieldErrors(requestError.errors ?? {})
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="profile-page" aria-labelledby="profile-title">
      <header className="profile-heading">
        <p className="profile-eyebrow">ESPACIO PERSONAL</p>
        <h1 id="profile-title">Hola, {user.name}</h1>
        <p>Consulta tu actividad y mantén actualizados tus datos personales.</p>
      </header>
      <div className="profile-grid">
        <article className="profile-card">
          <h2>Tu cuenta</h2>
          <dl className="profile-details">
            <div><dt>Usuario</dt><dd>{user.username}</dd></div>
            <div><dt>Correo</dt><dd>{user.email}</dd></div>
            <div><dt>Identificación</dt><dd>{user.profile?.identification ?? '—'}</dd></div>
            <div><dt>Último ingreso</dt><dd>{dateLabel(user.last_login_at)}</dd></div>
            <div><dt>Intentos fallidos actuales</dt><dd>{user.failed_login_attempts ?? 0} de 3</dd></div>
          </dl>
        </article>
        <form className="profile-card profile-form" onSubmit={submit}>
          <h2>Datos personales</h2>
          {fields.map(([name, label]) => (
            <label key={name} htmlFor={`profile-${name}`}>
              {label}
              <input id={`profile-${name}`} disabled={!editable || busy} maxLength={name === 'middle_names' ? 120 : 60} onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))} required={name !== 'middle_names'} value={form[name] ?? ''} />
              {fieldErrors[name] && <small role="alert">{fieldErrors[name][0]}</small>}
            </label>
          ))}
          <label htmlFor="profile-birth-date">Fecha de nacimiento
            <input id="profile-birth-date" disabled={!editable || busy} onChange={(event) => setForm((current) => ({ ...current, birth_date: event.target.value }))} type="date" value={form.birth_date ?? ''} />
            {fieldErrors.birth_date && <small role="alert">{fieldErrors.birth_date[0]}</small>}
          </label>
          {notice && <p className="profile-notice" role="status">{notice}</p>}
          {error && <p className="profile-error" role="alert">{error}</p>}
          {editable && <button className="profile-save" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar mis datos'}</button>}
        </form>
      </div>
    </section>
  )
}
