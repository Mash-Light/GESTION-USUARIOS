import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Resolver } from 'react-hook-form'
import type { ManagedPerson, PersonPayload } from './people.types'
import { ApiError } from '../../shared/api/httpClient'
import type { AuthUser } from '../auth/auth.types'
import type { ChangeEvent } from 'react'
import { createPerson, deletePerson, listPeople, unlockPerson, updatePerson } from './peopleService'
import './PeopleManagementPage.css'

type PersonFormValues = Omit<PersonPayload, 'password'> & { password: string }

const blankPerson: PersonFormValues = {
  first_name: '', middle_names: '', first_surname: '', second_surname: '',
  identification: '', birth_date: '', username: '', password: '', role: 'member', status: 'active',
}

const peopleColumns = [
  { accessorKey: 'first_name', id: 'name', header: 'Persona', enableSorting: true },
  { accessorKey: 'identification', id: 'identification', header: 'Identificación', enableSorting: true },
  { accessorKey: 'user.username', id: 'username', header: 'Usuario / correo', enableSorting: true },
  { id: 'role', header: 'Rol', enableSorting: false },
  { id: 'status', header: 'Estado', enableSorting: false },
  { id: 'last_login', header: 'Último acceso', enableSorting: false },
  { id: 'actions', header: 'Acciones', enableSorting: false },
]

function personSchema(isEditing: boolean) {
  const personName = (maximum: number) => z.string().trim().min(1, 'Este campo es obligatorio.').max(maximum).regex(/^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$/u, 'Escribe un nombre válido.')
  return z.object({
    first_name: personName(60),
    middle_names: z.string().trim().max(120).refine((value) => !value || /^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$/u.test(value), 'Escribe un nombre válido.'),
    first_surname: personName(60),
    second_surname: personName(60),
    identification: z.string().regex(/^(?!.*([0-9])\1{3})[0-9]{10}$/, 'Ingresa una identificación válida de 10 dígitos.'),
    birth_date: z.string().refine((value) => !value || value < new Date().toISOString().slice(0, 10), 'La fecha debe ser anterior al día de hoy.'),
    username: z.string().min(8, 'Usa al menos 8 caracteres.').max(20, 'Usa máximo 20 caracteres.').regex(/^(?=.*[A-Z])(?=.*[0-9])[A-Za-z0-9]+$/, 'Usa 8–20 caracteres, una mayúscula y un número.'),
    password: isEditing ? z.string().optional() : z.string().min(10, 'Usa 10 caracteres o más.').regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/, 'Incluye mayúscula, minúscula, número y símbolo; sin espacios.'),
    status: z.enum(['active', 'inactive']),
    role: z.literal('member'),
  }).superRefine((data, context) => {
    if (isEditing && data.password) {
      const valid = data.password.length >= 10 && /[A-Z]/.test(data.password) && /[a-z]/.test(data.password) && /[0-9]/.test(data.password) && /[^A-Za-z0-9\s]/.test(data.password) && !/\s/.test(data.password)
      if (!valid) context.addIssue({ code: 'custom', path: ['password'], message: 'Incluye mayúscula, minúscula, número y símbolo; mínimo 10 caracteres y sin espacios.' })
    }
  })
}

function dateLabel(value: string | null) {
  if (!value) return 'Sin ingresos'
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(new Date(value))
}

function PersonFormDialog({ person, onClose, onSaved }: { person: ManagedPerson | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const dialogRef = useRef<HTMLElement>(null)
  const defaultValues: PersonFormValues = person ? {
    first_name: person.first_name,
    middle_names: person.middle_names ?? '',
    first_surname: person.first_surname,
    second_surname: person.second_surname,
    identification: person.identification,
    birth_date: person.birth_date ?? '',
    username: person.user.username,
    password: '',
    status: person.user.status === 'active' ? 'active' : 'inactive',
    role: 'member' as const,
  } : blankPerson
  const { register, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting: saving } } = useForm<PersonFormValues>({
    resolver: zodResolver(personSchema(Boolean(person))) as Resolver<PersonFormValues>,
    defaultValues,
  })
  const saveMutation = useMutation({
    mutationFn: (data: PersonPayload) => person ? updatePerson(person.id, data) : createPerson(data),
  })
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const previousFocus = document.activeElement
    dialogRef.current?.querySelector<HTMLElement>('input, select, button')?.focus()
    return () => {
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [])

  async function submit(form: PersonFormValues) {
    clearErrors()
    setFormError('')

    const data: PersonPayload = { ...form }
    if (person && !data.password) delete data.password

    try {
      await saveMutation.mutateAsync(data)
      await onSaved()
    } catch (error) {
      const apiError = error instanceof ApiError ? error : new Error('No se pudo guardar la cuenta.')
      Object.entries(error instanceof ApiError ? error.errors : {}).forEach(([field, messages]) => {
        if (field in defaultValues && messages?.[0]) setError(field as keyof PersonFormValues, { type: 'server', message: messages[0] })
      })
      setFormError(error instanceof ApiError && error.status === 409
        ? error.message
        : error instanceof ApiError && error.status === 422
          ? 'Revisa los campos señalados antes de guardar.'
          : apiError.message)
    }
  }

  function fieldError(name: keyof PersonFormValues) {
    const message = errors[name]?.message
    return message ? <span className="people-field-error" id={`${name}-error`}>{message}</span> : null
  }

  function input(name: keyof PersonFormValues, label: string, { type = 'text', required = true, autoComplete, hint, maxLength }: { type?: string; required?: boolean; autoComplete?: string; hint?: string; maxLength?: number } = {}) {
    return (
      <div className="people-form-field" key={name}>
        <label htmlFor={`person-${name}`}>{label}{required && <span aria-hidden="true"> *</span>}</label>
        <input
          aria-describedby={errors[name] ? `${name}-error` : hint ? `${name}-hint` : undefined}
          aria-invalid={Boolean(errors[name])}
          autoComplete={autoComplete}
          id={`person-${name}`}
          maxLength={maxLength}
          {...register(name)}
          required={required}
          type={type}
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
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); (last as HTMLElement).focus() }
          if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); (first as HTMLElement).focus() }
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

        <form className="people-dialog-form" onSubmit={handleSubmit(submit)} noValidate>
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
            <div className="people-form-field people-role-note"><span>Rol de la cuenta</span><strong>Usuario</strong><small>Las cuentas administrativas están protegidas.</small></div>
            <div className="people-form-field">
              <label htmlFor="person-status">Estado *</label>
              <select id="person-status" {...register('status')} required>
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

function DeleteDialog({ person, onCancel, onConfirm, busy }: { person: ManagedPerson; onCancel: () => void; onConfirm: () => void; busy: boolean }) {
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

export default function PeopleManagementPage({ user }: { user: AuthUser }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('name')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [pageError, setPageError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<ManagedPerson | { create: true } | null>(null)
  const [deleting, setDeleting] = useState<ManagedPerson | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const deleteMutation = useMutation({ mutationFn: deletePerson })
  const unlockMutation = useMutation({ mutationFn: unlockPerson })

  const peopleQuery = useQuery({
    queryKey: ['people', { search: deferredSearch, status, sort, direction, page, per_page: 10 }],
    queryFn: ({ signal }) => listPeople({ search: deferredSearch, status, sort, direction, page, per_page: 10 }, { signal }),
    placeholderData: keepPreviousData,
  })
  const people = peopleQuery.data?.people ?? []
  const pagination = peopleQuery.data?.pagination ?? { current_page: page, last_page: 1, total: 0, per_page: 10 }
  const loading = peopleQuery.isPending
  const combinedError = pageError || peopleQuery.error?.message || ''
  const sorting = [{ id: sort, desc: direction === 'desc' }]
  // TanStack Table stores the controlled server-side state; React Compiler skips memoizing its table instance.
  // eslint-disable-next-line react/incompatible-library
  const table = useReactTable({
    data: people,
    columns: peopleColumns,
    getCoreRowModel: getCoreRowModel(),
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    pageCount: pagination.last_page,
    state: { sorting, pagination: { pageIndex: page - 1, pageSize: 10 } },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      if (next[0]) {
        setSort(next[0].id)
        setDirection(next[0].desc ? 'desc' : 'asc')
        setPage(1)
      }
    },
    onPaginationChange: (updater) => {
      const current = { pageIndex: page - 1, pageSize: 10 }
      const next = typeof updater === 'function' ? updater(current) : updater
      setPage(next.pageIndex + 1)
    },
  })

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['people'] })
  }

  async function saved() {
    setEditing(null)
    setNotice('Los cambios se guardaron correctamente.')
    if (page !== 1) setPage(1)
    await refresh()
  }

  async function remove() {
    if (!deleting) return
    const personToDelete = deleting
    setBusyId(personToDelete.id)
    try {
      await deleteMutation.mutateAsync(personToDelete.id)
      setDeleting(null)
      setPageError('')
      setNotice('La cuenta se archivó correctamente.')
      await refresh()
      if (page > 1 && people.length === 1) setPage((current) => current - 1)
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No se pudo eliminar la cuenta.')
      setDeleting(null)
    } finally {
      setBusyId(null)
    }
  }

  async function unlock(person: ManagedPerson) {
    setBusyId(person.id)
    setPageError('')
    try {
      await unlockMutation.mutateAsync(person.id)
      setPageError('')
      setNotice(`La cuenta de ${person.first_name} quedó desbloqueada.`)
      await refresh()
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'No se pudo desbloquear la cuenta.')
    } finally {
      setBusyId(null)
    }
  }

  function changeSort(event: ChangeEvent<HTMLSelectElement>) {
    const [nextSort, nextDirection] = event.target.value.split(':')
    setSort(nextSort)
    setDirection(nextDirection === 'desc' ? 'desc' : 'asc')
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
          <input id="people-search-input" onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar nombre, identificación, usuario…" type="search" value={search} />
        </label>
        <label className="people-filter-label" htmlFor="people-status-filter">Estado
          <select id="people-status-filter" onChange={(event) => { setStatus(event.target.value); setPage(1) }} value={status}>
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
      {combinedError && <p className="people-page-error" role="alert">{combinedError}</p>}

      <div aria-busy={peopleQuery.isFetching} className="people-table-frame">
        <div className="people-table-scroll">
          <table className="people-table">
            <thead>
              {table.getHeaderGroups().map((group) => <tr key={group.id}>{group.headers.map((header) => <th key={header.id} scope="col">{header.isPlaceholder ? null : header.column.getCanSort() ? <button aria-label={`Ordenar por ${header.column.columnDef.header}`} className="inline-flex items-center gap-1 font-semibold hover:text-brand-700" onClick={header.column.getToggleSortingHandler()} type="button">{flexRender(header.column.columnDef.header, header.getContext())}{header.column.getIsSorted() === 'asc' ? '↑' : header.column.getIsSorted() === 'desc' ? '↓' : ''}</button> : flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}
            </thead>
            <tbody>
              {loading && <tr><td className="people-state-row" colSpan={7}>Cargando cuentas…</td></tr>}
              {!loading && table.getRowModel().rows.map(({ original: person, id }) => (
                <tr key={id}>
                  <td data-label="Persona"><div className="people-person-cell"><span className="people-row-avatar" aria-hidden="true">{person.first_name.slice(0, 1)}{person.first_surname.slice(0, 1)}</span><span><strong>{person.first_name} {person.middle_names} {person.first_surname} {person.second_surname}</strong><small>Cuenta #{person.user.id}</small></span></div></td>
                  <td data-label="Identificación" className="people-mono">{person.identification}</td>
                  <td data-label="Usuario / correo"><span className="people-account-cell"><strong>{person.user.username}</strong><small>{person.user.email}</small></span></td>
                  <td data-label="Rol"><span className="people-role-chip">{person.user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
                  <td data-label="Estado"><span className={`people-status-chip ${person.user.status === 'active' ? 'is-active' : 'is-inactive'}`}><i aria-hidden="true" />{person.user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
                  <td data-label="Último acceso" className="people-date-cell">{dateLabel(person.user.last_login_at)}</td>
                  <td data-label="Acciones"><div className="people-row-actions">
                    {person.user.role !== 'admin' && person.user.locked_at && user.permissions?.includes('users.unlock') && <button className="people-action-button" disabled={busyId === person.id} onClick={() => unlock(person)} type="button">Desbloquear</button>}
                    {person.user.role !== 'admin' && person.user.id !== user.id && <button aria-label={`Editar cuenta de ${person.first_name} ${person.first_surname}`} className="people-action-button" onClick={() => setEditing(person)} type="button">Editar</button>}
                    {person.user.role === 'admin' && <span className="people-role-chip">Protegida</span>}
                    {person.user.role !== 'admin' && person.user.id !== user.id && <button aria-label={`Eliminar cuenta de ${person.first_name} ${person.first_surname}`} className="people-action-button people-action-danger" onClick={() => setDeleting(person)} type="button">Eliminar</button>}
                  </div></td>
                </tr>
              ))}
              {!loading && people.length === 0 && <tr><td className="people-state-row" colSpan={7}><span className="people-empty-mark" aria-hidden="true">⌕</span><strong>No encontramos cuentas</strong><span>Prueba otro término o crea una cuenta nueva.</span></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="people-pagination">
          <span>Mostrando <strong>{pagination.total === 0 ? 0 : (pagination.current_page - 1) * pagination.per_page + 1}–{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> de <strong>{pagination.total}</strong></span>
          <div><button aria-label="Página anterior" disabled={!table.getCanPreviousPage() || loading} onClick={() => table.previousPage()} type="button">←</button><span>Página {pagination.current_page} de {pagination.last_page}</span><button aria-label="Página siguiente" disabled={!table.getCanNextPage() || loading} onClick={() => table.nextPage()} type="button">→</button></div>
        </footer>
      </div>

      {editing && <PersonFormDialog onClose={() => setEditing(null)} onSaved={saved} person={'create' in editing ? null : editing} />}
      {deleting && <DeleteDialog busy={busyId === deleting.id} onCancel={() => setDeleting(null)} onConfirm={remove} person={deleting} />}
    </section>
  )
}
