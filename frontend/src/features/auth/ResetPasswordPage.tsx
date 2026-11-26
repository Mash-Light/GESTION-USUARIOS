import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight, Check, KeyRound, Mail } from 'lucide-react'
import { resetPassword } from './authService'
import AuthShell from './AuthShell'
import { ApiError } from '../../shared/api/httpClient'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'

const resetSchema = z.object({
  email: z.string().email('Ingresa un correo válido.'),
  password: z.string().min(10, 'Usa al menos 10 caracteres.').regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\s])\S+$/, 'Incluye mayúscula, minúscula, número y símbolo; sin espacios.'),
  confirmation: z.string().min(1, 'Confirma la contraseña.'),
}).refine((data) => data.password === data.confirmation, { path: ['confirmation'], message: 'Las contraseñas no coinciden.' })

type ResetValues = { email: string; password: string; confirmation: string }

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token') ?? ''
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const resetMutation = useMutation({ mutationFn: resetPassword })
  const loading = resetMutation.isPending
  const { register, handleSubmit, setError: setFieldError, formState: { errors } } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: params.get('email') ?? '', password: '', confirmation: '' },
  })

  async function submit(values: ResetValues) {
    setError('')
    setSuccess('')
    if (!token || !values.email) {
      setError('El enlace de recuperación no está completo. Solicita uno nuevo desde el inicio de sesión.')
      return
    }

    try {
      const response = await resetMutation.mutateAsync({ token, email: values.email, password: values.password, password_confirmation: values.confirmation })
      setSuccess(response.message ?? 'Tu contraseña se actualizó correctamente.')
    } catch (requestError) {
      const apiError = requestError instanceof ApiError ? requestError : new Error('No se pudo cambiar la contraseña.')
      const passwordError = requestError instanceof ApiError ? requestError.errors.password?.[0] : undefined
      if (passwordError) setFieldError('password', { type: 'server', message: passwordError })
      setError(passwordError ?? apiError.message)
    }
  }

  return (
    <AuthShell
      description="El enlace es de un solo uso y caduca. Tu contraseña se valida y protege en el servidor."
      eyebrow="SEGURIDAD DE CUENTA"
      title={<>Recupera el acceso<br /><span className="text-cyan-300">con tranquilidad.</span></>}
    >
      {success ? (
        <section aria-labelledby="reset-complete-title" className="grid justify-items-start gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-teal-50 text-teal-700"><Check aria-hidden="true" size={22} /></span>
          <p className="ui-eyebrow mb-0">CONTRASEÑA ACTUALIZADA</p>
          <h2 className="font-display text-[clamp(30px,3.4vw,40px)] font-bold leading-[1.13] tracking-[-.055em] text-ink" id="reset-complete-title">Ya puedes volver a tu cuenta.</h2>
          <p className="text-sm leading-6 text-muted">{success}</p>
          <a className="ui-button ui-button-primary mt-2 min-h-[52px] w-full no-underline" href="/">Volver al inicio de sesión <ArrowRight aria-hidden="true" size={18} /></a>
        </section>
      ) : (
        <form aria-labelledby="reset-title" className="grid gap-5" noValidate onSubmit={handleSubmit(submit)}>
          <header className="mb-2">
            <p className="ui-eyebrow mb-3">RECUPERACIÓN DE CUENTA</p>
            <h2 className="font-display text-[clamp(30px,3.4vw,40px)] font-bold leading-[1.13] tracking-[-.055em] text-ink" id="reset-title">Define una contraseña nueva.</h2>
            <p className="mt-3 text-[13px] leading-6 text-muted">Usa 10 caracteres o más, mayúscula, minúscula, número y símbolo. No incluyas espacios.</p>
          </header>
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-ink-soft" htmlFor="reset-email">Correo electrónico</label>
            <span className="relative flex items-center"><Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400" size={17} /><Input autoComplete="email" className="pl-10 read-only:bg-slate-50" id="reset-email" readOnly={Boolean(token)} type="email" {...register('email')} /></span>
            {errors.email && <small className="text-[11px] text-red-700" role="alert">{errors.email.message}</small>}
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-ink-soft" htmlFor="reset-password">Nueva contraseña</label>
            <span className="relative flex items-center"><KeyRound aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400" size={17} /><Input autoComplete="new-password" className="pl-10" id="reset-password" type="password" {...register('password')} /></span>
            {errors.password && <small className="text-[11px] text-red-700" role="alert">{errors.password.message}</small>}
          </div>
          <div className="grid gap-2">
            <label className="text-xs font-semibold text-ink-soft" htmlFor="reset-confirmation">Confirma la contraseña</label>
            <Input autoComplete="new-password" id="reset-confirmation" type="password" {...register('confirmation')} />
            {errors.confirmation && <small className="text-[11px] text-red-700" role="alert">{errors.confirmation.message}</small>}
          </div>
          {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800" role="alert">{error}</p>}
          <Button className="ui-button-primary min-h-[52px] w-full text-[13px]" disabled={loading} type="submit">{loading ? 'Actualizando…' : 'Guardar contraseña'} {!loading && <ArrowRight aria-hidden="true" size={18} />}</Button>
        </form>
      )}
    </AuthShell>
  )
}
