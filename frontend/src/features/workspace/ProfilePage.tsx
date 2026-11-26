import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight, Clock3, ShieldAlert, UserRound, type LucideIcon } from 'lucide-react'
import { ApiError, request } from '../../shared/api/httpClient'
import type { AuthProfile, AuthUser } from '../auth/auth.types'

const fields: Array<[keyof Pick<AuthProfile, 'first_name' | 'middle_names' | 'first_surname' | 'second_surname'>, string]> = [
  ['first_name', 'Primer nombre'], ['middle_names', 'Otros nombres'],
  ['first_surname', 'Primer apellido'], ['second_surname', 'Segundo apellido'],
]

const personName = z.string().trim().min(1, 'Este campo es obligatorio.').max(60).regex(/^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$/u, 'Escribe un nombre válido.')
const profileSchema = z.object({
  first_name: personName,
  middle_names: z.string().trim().max(120).refine((value) => !value || /^[\p{L}\p{M}][\p{L}\p{M}'’ -]*$/u.test(value), 'Escribe un nombre válido.'),
  first_surname: personName,
  second_surname: personName,
  birth_date: z.string().refine((value) => !value || value < new Date().toISOString().slice(0, 10), 'La fecha debe ser anterior al día de hoy.'),
})

type ProfileValues = z.infer<typeof profileSchema>

function dateLabel(value?: string | null) {
  return value ? new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Aún no registra ingresos'
}

function ProfileMetric({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-brand-700"><Icon aria-hidden="true" size={16} /></span><span className="min-w-0 flex-1"><small className="block text-[10px] text-muted">{label}</small><strong className="mt-1 block truncate text-xs font-semibold text-ink-soft">{value}</strong></span></div>
}

export default function ProfilePage({ user, onUserUpdated }: { user: AuthUser; onUserUpdated: (user: AuthUser) => void }) {
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const editable = Boolean(user.permissions?.includes('profile.update-own'))
  const profileDefaults: ProfileValues = {
    first_name: user.profile?.first_name ?? '',
    middle_names: user.profile?.middle_names ?? '',
    first_surname: user.profile?.first_surname ?? '',
    second_surname: user.profile?.second_surname ?? '',
    birth_date: user.profile?.birth_date ?? '',
  }
  const { register, handleSubmit, reset, setError: setFieldError, formState: { errors: fieldErrors } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults,
  })
  const updateMutation = useMutation({
    mutationFn: (editableData: Record<string, string>) => request('/api/profile', { method: 'PATCH', body: JSON.stringify(editableData) }),
  })
  const busy = updateMutation.isPending

  async function submit(form: ProfileValues) {
    setNotice('')
    setError('')
    try {
      const editableNames = [...fields.map(([name]) => name), 'birth_date'] as Array<keyof ProfileValues>
      const editableData = Object.fromEntries(editableNames.map((name) => [name, form[name] ?? ''])) as Record<string, string>
      const response = await updateMutation.mutateAsync(editableData)
      onUserUpdated(response.data.user)
      reset({
        first_name: response.data.user.profile.first_name ?? '',
        middle_names: response.data.user.profile.middle_names ?? '',
        first_surname: response.data.user.profile.first_surname ?? '',
        second_surname: response.data.user.profile.second_surname ?? '',
        birth_date: response.data.user.profile.birth_date ?? '',
      })
      setNotice('Tus datos se actualizaron correctamente.')
    } catch (requestError) {
      const apiError = requestError instanceof ApiError ? requestError : new Error('No se pudo actualizar el perfil.')
      setError(requestError instanceof ApiError && requestError.status === 422 ? 'Revisa los campos señalados.' : apiError.message)
      if (requestError instanceof ApiError) Object.entries(requestError.errors).forEach(([field, messages]) => {
        if (field in profileSchema.shape && messages[0]) setFieldError(field as keyof ProfileValues, { type: 'server', message: messages[0] })
      })
    }
  }

  return (
    <section aria-labelledby="profile-title" className="mx-auto w-full max-w-[1080px] px-4 py-7 sm:px-7 sm:py-10 lg:px-12">
      <header className="mb-6">
        <p className="ui-eyebrow mb-2">ESPACIO PERSONAL</p>
        <h1 className="font-display text-[clamp(28px,3vw,36px)] font-bold tracking-[-.055em] text-ink" id="profile-title">Hola, {user.name}</h1>
        <p className="mt-2 text-xs leading-5 text-muted">Consulta tu actividad y mantén actualizados tus datos personales.</p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(250px,.85fr)_minmax(330px,1.15fr)]">
        <article className="ui-card p-5 sm:p-6">
          <header className="mb-3 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[9px] bg-sky-100 text-brand-700"><UserRound aria-hidden="true" size={18} /></span><h2 className="font-display text-base font-bold text-ink-soft">Tu cuenta</h2></header>
          <div className="divide-y divide-slate-100">
            <ProfileMetric icon={UserRound} label="Usuario" value={user.username} />
            <ProfileMetric icon={UserRound} label="Correo" value={user.email} />
            <ProfileMetric icon={ShieldAlert} label="Identificación" value={user.profile?.identification ?? '—'} />
            <ProfileMetric icon={Clock3} label="Último ingreso" value={dateLabel(user.last_login_at)} />
            <ProfileMetric icon={ShieldAlert} label="Intentos fallidos actuales" value={`${user.failed_login_attempts ?? 0} de 3`} />
          </div>
        </article>

        <form aria-labelledby="profile-form-title" className="ui-card grid gap-4 p-5 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
          <h2 className="font-display text-base font-bold text-ink-soft" id="profile-form-title">Datos personales</h2>
          {fields.map(([name, label]) => (
            <label className="grid gap-1.5 text-[11px] font-semibold text-ink-soft" htmlFor={`profile-${name}`} key={name}>
              {label}
              <input aria-describedby={fieldErrors[name] ? `${name}-error` : undefined} aria-invalid={Boolean(fieldErrors[name])} className="ui-input min-h-10 text-xs" disabled={!editable || busy} id={`profile-${name}`} maxLength={name === 'middle_names' ? 120 : 60} {...register(name)} />
              {fieldErrors[name] && <small className="text-[10px] font-normal text-red-700" id={`${name}-error`} role="alert">{fieldErrors[name]?.message}</small>}
            </label>
          ))}
          <label className="grid gap-1.5 text-[11px] font-semibold text-ink-soft" htmlFor="profile-birth-date">Fecha de nacimiento
            <input aria-describedby={fieldErrors.birth_date ? 'birth-date-error' : undefined} aria-invalid={Boolean(fieldErrors.birth_date)} className="ui-input min-h-10 text-xs" disabled={!editable || busy} id="profile-birth-date" type="date" {...register('birth_date')} />
            {fieldErrors.birth_date && <small className="text-[10px] font-normal text-red-700" id="birth-date-error" role="alert">{fieldErrors.birth_date.message}</small>}
          </label>
          {notice && <p className="rounded-lg border border-teal-100 bg-teal-50 px-3 py-2.5 text-xs text-teal-800" role="status">{notice}</p>}
          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-800" role="alert">{error}</p>}
          {editable && <button className="ui-button ui-button-primary mt-1 w-full justify-between sm:w-fit sm:justify-center" disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar mis datos'} <ArrowRight aria-hidden="true" size={15} /></button>}
        </form>
      </div>
    </section>
  )
}
