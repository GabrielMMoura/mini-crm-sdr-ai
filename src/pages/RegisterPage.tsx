import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { useAuth } from '../features/auth/hooks/useAuth'

function getFriendlyRegisterError() {
  return 'Nao foi possivel criar sua conta. Confira os dados e tente novamente.'
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading, signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedFullName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedFullName || !trimmedEmail || !password || !confirmPassword) {
      setErrorMessage('Preencha todos os campos para criar sua conta.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmacao de senha deve ser igual a senha.')
      return
    }

    try {
      setIsSubmitting(true)
      await signUp(trimmedEmail, password, trimmedFullName)
      setSuccessMessage('Cadastro criado. Verifique seu email para confirmar sua conta antes de entrar.')
    } catch {
      setErrorMessage(getFriendlyRegisterError())
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <Card className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Criar conta</h1>
          <p className="mt-2 text-sm text-slate-600">Crie seu acesso ao Mini CRM SDR.</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="register-name">
              Nome completo
            </label>
            <Input
              autoComplete="name"
              disabled={isSubmitting}
              id="register-name"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Seu nome"
              type="text"
              value={fullName}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="register-email">
              Email
            </label>
            <Input
              autoComplete="email"
              disabled={isSubmitting}
              id="register-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@empresa.com"
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="register-password">
              Senha
            </label>
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              id="register-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo de 6 caracteres"
              type="password"
              value={password}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="register-confirm-password">
              Confirmar senha
            </label>
            <Input
              autoComplete="new-password"
              disabled={isSubmitting}
              id="register-confirm-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita sua senha"
              type="password"
              value={confirmPassword}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {successMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {successMessage}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting || isLoading} type="submit">
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-600">
          Ja tem conta?{' '}
          <Link className="font-medium text-slate-950 underline-offset-4 hover:underline" to="/login">
            Entrar
          </Link>
        </p>
      </Card>
    </main>
  )
}
