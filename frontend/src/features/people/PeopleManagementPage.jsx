import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { createPerson, deletePerson, listPeople, unlockPerson, updatePerson } from './peopleService.js'
import './PeopleManagementPage.css'

const blankPerson = {
  first_name: '', middle_names: '', first_surname: '', second_surname: '',
  identification: '', birth_date: '', username: '', password: '', role: 'member', status: 'active',
}

function dateLabel(value) {
  if (!value) return 'Sin ingresos'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value))
}

function PersonFormDialog({ person, onClose, onSaved }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState(person ? {
    first_name: person.first_name,
    middle_names: person.middle_names ?? '',
    first_surname: person.first_surname,
    second_surname: person.second_surname,
    identification: person.identification,
    birth_date: person.birth_date ?? '',
    username: person.user.username,
    password: '',
    role: person.user.role ?? 'member',
    status: person.user.status,
  } : blankPerson)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const previousFocus = document.activeElement
    dialogRef.current?.querySelector('input, select, button')?.focus()
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
    setErrors((current) => ({ ...current, [event.target.name]: undefined }))
    setFormError('')
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setErrors({})
    setFormError('')

    const data = { ...form }
    if (person && !data.password) delete data.password

    try {
      if (person) await updatePerson(person.id, data)
      else await createPerson(data)
      await onSaved()
    } catch (error) {
      setErrors(error.errors ?? {})
      setFormError(error.status === 409
        ? error.message
        : error.status === 422
          ? 'Revisa los campos señalados antes de guardar.'
          : error.message)
    } finally {
      setSaving(false)
    }
  }

  function fieldError(name) {
    const message = errors[name]?.[0]
    return message ? <span className="people-field-error" id={`${name}-error`}>{message}</span> : null
  }

  function input(name, label, { type = 'text', required = true, autoComplete, hint, maxLength } = {}) {
    return (
      <div className="people-form-field" key={name}>
        <label htmlFor={`person-${name}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
        <input
          aria-describedby={errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
          aria-invalid={Boolean(errors[name])}
          autoComplete={autoComplete}
          id={`person-${name}`}
          maxLength={maxLength}
          name={name}
          onChange={updateField}
          required={required}
          type={type}
          value={form[name] ?? ''}
        />
        {hint && !errors[name] && <span className="people-field-hint" id={`${name}-hint`}>{hint}</span>}
        {fieldError(name)}
      </div>
    )
  }

  return (
    <div className="people-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section
        aria-labelledby="person-dialog-title"
        aria-modal="true"
        className="people-dialog"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key !== 'Tab') return
          const focusable = [...event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
          const first = focusable[0]
          const last = focusable.at(-1)
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
        }}
        ref={dialogRef}
        role="dialog"
      >
        <header className="people-dialog-header">
          <div>
            <p className="people-eyebrow">REGISTRO DE PERSONA</p>
            <h2 id="person-dialog-title">{person ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
          </div>
          <button aria-label="Cerrar formulario" className="people-icon-button" onClick={onClose} type="button">×</button>
        </header>

        <form className="people-dialog-form" onSubmit={submit}>
          <div aria-hidden="true" className="people-form-section-label">DATOS PERSONALES</div>
          <div className="people-form-grid">
            {input('first_name', 'Primer nombre', { maxLength: 60, autoComplete: 'given-name' })}
            {input('middle_names', 'Otros nombres', { required: false, maxLength: 120 })}
            {input('first_surname', 'Primer apellido', { maxLength: 60, autoComplete: 'family-name' })}
            {input('second_surname', 'Segundo apellido', { maxLength: 60 })}
            {input('identification', 'Identificación', { maxLength: 10, hint: '10 dígitos; evita cuatro iguales consecutivos.' })}
            {input('birth_date', 'Fecha de nacimiento', { type: 'date', required: false })}
          </div>

          <div aria-hidden="true" className="people-form-section-label">CUENTA Y ACCESO</div>
          <div className="people-form-grid">
            {input('username', 'Nombre de usuario', { autoComplete: 'username', maxLength: 20, hint: '8–20 caracteres, al menos una mayúscula y un número.' })}
            {input('password', person ? 'Nueva contraseña' : 'Contraseña inicial', {
              type: 'password', required: !person, autoComplete: person ? 'new-password' : 'new-password',
              hint: person ? 'Déjalo vacío para conservar la contraseña actual.' : '10 o más caracteres, mayúscula, minúscula, número y símbolo.',
            })}
            <div className="people-form-field">
              <label htmlFor="person-role">Rol *</label>
              <select id="person-role" name="role" onChange={updateField} required value={form.role}>
                <option value="member">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
              {fieldError('role')}
            </div>
            <div className="people-form-field">
              <label htmlFor="person-status">Estado *</label>
              <select id="person-status" name="status" onChange={updateField} required value={form.status}>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
              {fieldError('status')}
            </div>
          </div>

          <p className="people-email-note">El correo institucional se genera automáticamente con el nombre y los apellidos.</p>
          {formError && <p className="people-form-alert" role="alert">{formError}</p>}
          <footer className="people-dialog-actions">
            <button className="people-button people-button-quiet" onClick={onClose} type="button">Cancelar</button>
            <button className="people-button people-button-primary" disabled={saving} type="submit">
              {saving ? 'Guardando…' : person ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}

function DeleteDialog({ person, onCancel, onConfirm, busy }) {
  return (
    <div className="people-dialog-backdrop">
      <section aria-labelledby="delete-dialog-title" aria-modal="true" className="people-dialog people-confirm-dialog" role="alertdialog">
        <p className="people-eyebrow">CONFIRMA LA ACCIÓN</p>
        <h2 id="delete-dialog-title">Eliminar cuenta</h2>
        <p>Se archivarán la persona y su cuenta de <strong>{person.first_name} {person.first_surname}</strong>. Los datos no se borrarán de la auditoría.</p>
        <footer className="people-dialog-actions">
          <button className="people-button people-button-quiet" onClick={onCancel} type="button">Cancelar</button>
          <button className="people-button people-button-danger" disabled={busy} onClick={onConfirm} type="button">{busy ? 'Eliminando…' : 'Eliminar cuenta'}</button>
        </footer>
      </section>
    </div>
  )
}

export default function PeopleManagementPage({ user }) {
  const [people, setPeople] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('name')
  const [direction, setDirection] = useState('asc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busyId, setBusyId] = useState(null)

  async function refresh() {
    setLoading(true)
    try {
      const result = await listPeople({ search: deferredSearch, status, sort, direction, page, per_page: 10 })
      setPeople(result.people)
      setPagination(result.pagination)
      setPageError('')
    } catch (error) {
      setPageError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    listPeople({ search: deferredSearch, status, sort, direction, page, per_page: 10 }, { signal: controller.signal })
      .then((result) => {
        setPeople(result.people)
        setPagination(result.pagination)
        setPageError('')
      })
      .catch((error) => { if (!controller.signal.aborted) setPageError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [deferredSearch, status, sort, direction, page])

  async function saved() {
    setEditing(null)
    setNotice('Los cambios se guardaron correctamente.')
    if (page !== 1) { setLoading(true); setPage(1) }
    else await refresh()
  }

  async function remove() {
    setBusyId(deleting.id)
    try {
      await deletePerson(deleting.id)
      setDeleting(null)
      setNotice('La cuenta se archivó correctamente.')
      if (page > 1 && people.length === 1) { setLoading(true); setPage((current) => current - 1) }
      else await refresh()
    } catch (error) {
      setPageError(error.message)
      setDeleting(null)
    } finally {
      setBusyId(null)
    }
  }

  async function unlock(person) {
    setBusyId(person.id)
    setPageError('')
    try {
      await unlockPerson(person.id)
      setNotice(`La cuenta de ${person.first_name} quedó desbloqueada.`)
      await refresh()
    } catch (error) {
      setPageError(error.message)
    } finally {
      setBusyId(null)
    }
  }

  function changeSort(event) {
    const [nextSort, nextDirection] = event.target.value.split(':')
    setLoading(true)
    setSort(nextSort)
    setDirection(nextDirection)
    setPage(1)
  }

  return (
    <section className="people-page" aria-labelledby="people-page-title">
      <header className="people-page-heading">
        <div>
          <p className="people-eyebrow">ADMINISTRACIÓN · ACCESOS</p>
          <h1 id="people-page-title">Personas y cuentas</h1>
          <p>Administra identidades, accesos y estados desde un solo lugar.</p>
        </div>
        <button className="people-button people-button-primary" onClick={() => setEditing({ create: true })} type="button">
          <span aria-hidden="true">＋</span> Nueva cuenta
        </button>
      </header>

      <div className="people-summary-card">
        <span className="people-summary-icon" aria-hidden="true">◎</span>
        <div><strong>{pagination.total}</strong><span>registros encontrados</span></div>
        <span className="people-summary-caption">La lista respeta tus filtros actuales.</span>
      </div>

      <div className="people-toolbar">
        <label className="people-search" htmlFor="people-search-input">
          <span aria-hidden="true">⌕</span>
          <input id="people-search-input" onChange={(event) => { setLoading(true); setSearch(event.target.value); setPage(1) }} placeholder="Buscar nombre, identificación, usuario…" type="search" value={search} />
        </label>
        <label className="people-filter-label" htmlFor="people-status-filter">Estado
          <select id="people-status-filter" onChange={(event) => { setLoading(true); setStatus(event.target.value); setPage(1) }} value={status}>
            <option value="">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>
        <label className="people-filter-label" htmlFor="people-sort-filter">Ordenar
          <select id="people-sort-filter" onChange={changeSort} value={`${sort}:${direction}`}>
            <option value="name:asc">Nombre A–Z</option>
            <option value="name:desc">Nombre Z–A</option>
            <option value="created_at:desc">Más recientes</option>
            <option value="username:asc">Usuario A–Z</option>
          </select>
        </label>
      </div>

      {notice && <p className="people-notice" role="status"><span aria-hidden="true">✓</span>{notice}<button aria-label="Cerrar aviso" onClick={() => setNotice('')} type="button">×</button></p>}
      {pageError && <p className="people-page-error" role="alert">{pageError}</p>}

      <div aria-busy={loading} className="people-table-frame">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              <tr><th scope="col">Persona</th><th scope="col">Identificación</th><th scope="col">Usuario / correo</th><th scope="col">Rol</th><th scope="col">Estado</th><th scope="col">Último acceso</th><th scope="col"><span className="visually-hidden">Acciones</span></th></tr>
            </thead>
            <tbody>
              {loading && <tr><td className="people-state-row" colSpan="7">Cargando cuentas…</td></tr>}
              {!loading && people.map((person) => (
                <tr key={person.id}>
                  <td data-label="Persona"><div className="people-person-cell"><span className="people-row-avatar" aria-hidden="true">{person.first_name.slice(0, 1)}{person.first_surname.slice(0, 1)}</span><span><strong>{person.first_name} {person.middle_names} {person.first_surname} {person.second_surname}</strong><small>Cuenta #{person.user.id}</small></span></div></td>
                  <td data-label="Identificación" className="people-mono">{person.identification}</td>
                  <td data-label="Usuario / correo"><span className="people-account-cell"><strong>{person.user.username}</strong><small>{person.user.email}</small></span></td>
                  <td data-label="Rol"><span className="people-role-chip">{person.user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                  <td data-label="Estado"><span className={`people-status-chip ${person.user.status === 'active' ? 'is-active' : 'is-inactive'}`}><i aria-hidden="true" />{person.user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                  <td data-label="Último acceso" className="people-date-cell">{dateLabel(person.user.last_login_at)}</td>
                  <td data-label="Acciones"><div className="people-row-actions">
                    {person.user.locked_at && user.permissions?.includes('users.unlock') && <button className="people-action-button" disabled={busyId === person.id} onClick={() => unlock(person)} type="button">Desbloquear</button>}
                    <button aria-label={`Editar cuenta de ${person.first_name} ${person.first_surname}`} className="people-action-button" onClick={() => setEditing(person)} type="button">Editar</button>
                    {person.user.id !== user.id && <button aria-label={`Eliminar cuenta de ${person.first_name} ${person.first_surname}`} className="people-action-button people-action-danger" onClick={() => setDeleting(person)} type="button">Eliminar</button>}
                  </div></td>
                </tr>
              ))}
              {!loading && people.length === 0 && <tr><td className="people-state-row" colSpan="7"><span className="people-empty-mark" aria-hidden="true">⌕</span><strong>No encontramos cuentas</strong><span>Prueba otro término o crea una cuenta nueva.</span></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="people-pagination">
          <span>Mostrando <strong>{pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> de <strong>{pagination.total}</strong></span>
          <div><button aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((current) => current - 1) }} type="button">←</button><span>Página {pagination.current_page} de {pagination.last_page}</span><button aria-label="Página siguiente" disabled={page >= pagination.last_page || loading} onClick={() => { setLoading(true); setPage((current) => current + 1) }} type="button">→</button></div>
        </footer>
      </div>

      {editing && <PersonFormDialog onClose={() => setEditing(null)} onSaved={saved} person={editing.create ? null : editing} />}
      {deleting && <DeleteDialog busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={remove} person={deleting} />}
    </section>
  )
}
