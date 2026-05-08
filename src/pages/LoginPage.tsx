import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../features/auth/hooks/useAuth'

function getFriendlyAuthError(error: unknown) {
  if (error instanceof Error && error.message.toLowerCase().includes('invalid login')) {
    return 'Email ou senha invalidos.'
  }

  return 'Nao foi possivel entrar. Confira seus dados e tente novamente.'
}

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setErrorMessage('Preencha email e senha para entrar.')
      return
    }

    try {
      setIsSubmitting(true)
      await signIn(trimmedEmail, password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      setErrorMessage(getFriendlyAuthError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <Card className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Entrar</h1>
          <p className="mt-2 text-sm text-slate-600">Acesse sua conta do Mini CRM SDR.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="login-email">
              Email
            </label>
            <Input
              autoComplete="email"
              disabled={isSubmitting}
              id="login-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="login-password">
              Senha
            </label>
            <Input
              autoComplete="current-password"
              disabled={isSubmitting}
              id="login-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting || isLoading} type="submit">
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Ainda nao tem conta?{' '}
          <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" to="/register">
            Criar conta
          </Link>
        </p>
      </Card>
    </main>
  )
}
