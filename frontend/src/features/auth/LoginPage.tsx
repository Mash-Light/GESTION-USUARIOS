import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { login, requestPasswordReset } from './authService'
import type { AuthUser } from './auth.types'
import { Button } from '../../shared/components/ui/button'
import { Input } from '../../shared/components/ui/input'
import { ApiError } from '../../shared/api/httpClient'

const loginSchema = z.object({ identifier: z.string().trim().min(1, 'Ingresa tu usuario o correo.'), password: z.string().min(1, 'Ingresa tu contraseña.') })
const recoverySchema = z.object({ identifier: z.string().trim().email('Ingresa un correo válido.'), password: z.string().optional() })
type LoginValues = { identifier: string; password: string }

export default function LoginPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void | Promise<void> }) {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [recovery, setRecovery] = useState(false)
  const [notice, setNotice] = useState('')
  const loginMutation = useMutation({ mutationFn: login })
  const recoveryMutation = useMutation({ mutationFn: requestPasswordReset })
  const loading = loginMutation.isPending || recoveryMutation.isPending
  const { register, handleSubmit, resetField, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(recovery ? recoverySchema : loginSchema) as Resolver<LoginValues>,
    defaultValues: { identifier: '', password: '' },
  })

  async function submit(values: LoginValues) {
    setError('')
    setNotice('')

    try {
      if (recovery) {
        await recoveryMutation.mutateAsync(values.identifier)
        setNotice('Si los datos corresponden a una cuenta, recibirás instrucciones para continuar.')
        return
      }

      await onAuthenticated(await loginMutation.mutateAsync({ login: values.identifier, password: values.password }))
    } catch (requestError) {
      const apiError = requestError instanceof ApiError ? requestError : new Error('No se pudo completar la solicitud.')
      setError(requestError instanceof ApiError && requestError.status === 429
        ? 'Se alcanzó el límite de intentos. Espera un momento antes de volver a intentarlo.'
        : requestError instanceof ApiError && requestError.status === 423
          ? 'La cuenta está bloqueada. Contacta a un administrador para solicitar el desbloqueo.'
          : requestError instanceof ApiError && requestError.status === 409
            ? 'Esta cuenta ya tiene una sesión activa.'
            : requestError instanceof ApiError && requestError.status === 403
              ? 'La cuenta no está habilitada para iniciar sesión.'
              : apiError.message === 'Failed to fetch'
                ? 'No se pudo conectar con la API. Comprueba que el servidor esté iniciado.'
                : apiError.message)
    }
  }

  function toggleRecovery() {
    setRecovery((value) => !value)
    resetField('password')
    setError('')
    setNotice('')
  }

  return (
    <form aria-labelledby="login-title" className="grid gap-5" noValidate onSubmit={handleSubmit(submit)}>
      <header className="mb-3">
        <p className="ui-eyebrow mb-3">{recovery ? 'RECUPERACIÓN DE CUENTA' : 'ACCESO SEGURO'}</p>
        <h2 className="font-display text-[clamp(30px,3.4vw,40px)] font-bold leading-[1.13] tracking-[-.055em] text-ink" id="login-title">
          {recovery ? 'Recupera tu acceso.' : 'Qué bueno verte.'}
        </h2>
        <p className="mt-3 max-w-sm text-[13px] leading-6 text-muted">
          {recovery ? 'Te enviaremos los siguientes pasos si la cuenta está registrada.' : 'Ingresa tus datos para continuar con tu jornada.'}
        </p>
      </header>

      <div className="grid gap-2">
        <label className="text-xs font-semibold text-ink-soft" htmlFor="login-identifier">{recovery ? 'Correo electrónico' : 'Correo o nombre de usuario'}</label>
        <span className="relative flex items-center">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400" size={17} />
          <Input autoComplete={recovery ? 'email' : 'username'} className="pl-10" id="login-identifier" placeholder={recovery ? 'nombre@dominio.com' : 'Tu correo o nombre de usuario'} type={recovery ? 'email' : 'text'} {...register('identifier')} />
        </span>
        {errors.identifier && <small className="text-[11px] text-red-700" role="alert">{errors.identifier.message}</small>}
      </div>

      {!recovery && (
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-xs font-semibold text-ink-soft" htmlFor="login-password">Contraseña</label>
            <button className="text-xs font-semibold text-brand-700 underline-offset-4 hover:underline" disabled={loading} onClick={toggleRecovery} type="button">¿La olvidaste?</button>
          </div>
          <span className="relative flex items-center">
            <KeyRound aria-hidden="true" className="pointer-events-none absolute left-3.5 text-slate-400" size={17} />
            <Input autoComplete="current-password" className="pl-10 pr-12" id="login-password" placeholder="Ingresa tu contraseña" type={showPassword ? 'text' : 'password'} {...register('password')} />
            <button aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute right-2 grid size-9 place-items-center rounded-md text-slate-400 hover:bg-slate-50 hover:text-brand-700" onClick={() => setShowPassword((value) => !value)} type="button">
              {showPassword ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
            </button>
          </span>
          {errors.password && <small className="text-[11px] text-red-700" role="alert">{errors.password.message}</small>}
        </div>
      )}

      {error && <p className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800" role="alert">{error}</p>}
      {notice && <p className="rounded-lg border border-teal-100 bg-teal-50 px-3.5 py-3 text-xs leading-5 text-teal-800" role="status">{notice}</p>}

      <Button className="ui-button-primary min-h-[52px] w-full text-[13px]" disabled={loading} type="submit">
        {loading ? 'Procesando…' : recovery ? 'Enviar instrucciones' : 'Ingresar a mi cuenta'}
        {!loading && <ArrowRight aria-hidden="true" size={18} />}
      </Button>

      {recovery ? (
        <button className="mx-auto -mt-1 text-xs font-semibold text-brand-700 underline-offset-4 hover:underline" disabled={loading} onClick={toggleRecovery} type="button">Volver al inicio de sesión</button>
      ) : (
        <p className="text-center text-[11px] leading-5 text-muted">¿No puedes ingresar? Contacta al administrador de tu cuenta.</p>
      )}
    </form>
  )
}
