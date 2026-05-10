import { useMemo, useState, type FormEvent } from 'react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { useAiSettings } from '../features/ai-settings/hooks/useAiSettings'

const modelOptions = ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o']

function formatUpdatedAt(value?: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function AiSettingsPage() {
  const {
    deleteSettings,
    error,
    feedback,
    isConfigured,
    isDeleting,
    isLoading,
    isSaving,
    isTesting,
    saveSettings,
    settings,
    testSettings,
  } = useAiSettings()
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o-mini')
  const [testResult, setTestResult] = useState<string | null>(null)

  const updatedAt = useMemo(() => formatUpdatedAt(settings?.updated_at), [settings?.updated_at])
  const isBusy = isSaving || isTesting || isDeleting

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTestResult(null)
    await saveSettings({ apiKey, model })
    setApiKey('')
  }

  async function handleTestTypedKey() {
    setTestResult(null)
    const response = await testSettings({ apiKey, model })
    setTestResult(response.success ? 'Chave informada validada com sucesso.' : response.message)
  }

  async function handleTestSavedKey() {
    setTestResult(null)
    const response = await testSettings()
    setTestResult(response.success ? 'Chave salva validada com sucesso.' : response.message)
  }

  async function handleDelete() {
    setTestResult(null)
    await deleteSettings()
    setApiKey('')
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Configurações de IA</h1>
        <p className="mt-2 text-sm text-slate-600">
          Configure sua OpenAI API key para gerar mensagens com a sua própria conta.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Estado atual</h2>
            <p className="mt-1 text-sm text-slate-600">
              Apenas metadados seguros são exibidos nesta tela.
            </p>
          </div>

          {isLoading ? <p className="text-sm text-slate-600">Carregando configurações...</p> : null}

          {!isLoading && isConfigured && settings ? (
            <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">OpenAI configurada</p>
              <dl className="space-y-2 text-sm text-emerald-900">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <dt className="font-medium">Chave</dt>
                  <dd>Terminada em ****{settings.api_key_last4}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <dt className="font-medium">Modelo</dt>
                  <dd>{settings.model}</dd>
                </div>
                {updatedAt ? (
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <dt className="font-medium">Atualizada em</dt>
                    <dd>{updatedAt}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}

          {!isLoading && !isConfigured ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Nenhuma chave OpenAI configurada.
            </p>
          ) : null}

          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            Sua chave é criptografada antes de ser salva e nunca é exibida novamente.
          </p>
        </Card>

        <Card className="space-y-5">
          <div>
            <h2 className="text-base font-semibold tracking-normal">Chave OpenAI</h2>
            <p className="mt-1 text-sm text-slate-600">
              Cole uma nova chave para salvar ou testar. O campo sempre fica vazio após salvar.
            </p>
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {feedback ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedback}
            </p>
          ) : null}

          {testResult ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {testResult}
            </p>
          ) : null}

          <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
            <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="ai-api-key">
              <span>OpenAI API key</span>
              <Input
                autoComplete="off"
                disabled={isBusy}
                id="ai-api-key"
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="sk-..."
                type="password"
                value={apiKey}
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="ai-model">
              <span>Modelo</span>
              <Select
                disabled={isBusy}
                id="ai-model"
                onChange={(event) => setModel(event.target.value)}
                value={model}
              >
                {modelOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </label>

            <div className="flex flex-wrap gap-3">
              <Button disabled={isBusy} type="submit">
                {isSaving ? 'Salvando...' : 'Salvar chave'}
              </Button>
              <Button
                className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                disabled={isBusy || !apiKey.trim()}
                onClick={() => void handleTestTypedKey()}
              >
                {isTesting ? 'Testando...' : 'Testar chave informada'}
              </Button>
              <Button
                className="border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                disabled={isBusy || !isConfigured}
                onClick={() => void handleTestSavedKey()}
              >
                Testar chave salva
              </Button>
              <Button
                className="border border-red-200 bg-white text-red-700 hover:bg-red-50"
                disabled={isBusy || !isConfigured}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? 'Removendo...' : 'Remover chave'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </section>
  )
}
