import { useMemo, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Textarea } from '../components/ui/Textarea'
import { useLeadCustomFields } from '../features/leads/hooks/useLeadCustomFields'
import type {
  CreateLeadCustomFieldInput,
  LeadCustomField,
  LeadCustomFieldType,
  UpdateLeadCustomFieldInput,
} from '../features/leads/types/leadCustomField.types'
import { useCurrentWorkspace } from '../features/workspaces/hooks/useCurrentWorkspace'

const fieldTypeOptions: Array<{ label: string; value: LeadCustomFieldType }> = [
  { label: 'Texto curto', value: 'text' },
  { label: 'Texto longo', value: 'textarea' },
  { label: 'Numero', value: 'number' },
  { label: 'Data', value: 'date' },
  { label: 'Sim/Nao', value: 'boolean' },
  { label: 'Selecao', value: 'select' },
]

type LeadFieldFormState = {
  name: string
  key: string
  type: LeadCustomFieldType
  optionsText: string
  is_required: boolean
  is_active: boolean
  position: string
}

const emptyFieldForm: LeadFieldFormState = {
  name: '',
  key: '',
  type: 'text',
  optionsText: '',
  is_required: false,
  is_active: true,
  position: '0',
}

function slugifyFieldKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, '')
    .replace(/[\s_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function parseOptions(optionsText: string) {
  return optionsText
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
}

function getFieldTypeLabel(type: LeadCustomFieldType) {
  return fieldTypeOptions.find((option) => option.value === type)?.label ?? type
}

function getFormFromField(field: LeadCustomField): LeadFieldFormState {
  return {
    name: field.name,
    key: field.key,
    type: field.type,
    optionsText: field.options.join('\n'),
    is_required: field.is_required,
    is_active: field.is_active,
    position: String(field.position),
  }
}

function validateFieldForm(form: LeadFieldFormState) {
  if (!form.name.trim()) {
    return 'Informe o nome do campo.'
  }

  if (!form.key.trim()) {
    return 'Informe a chave do campo.'
  }

  if (!form.type) {
    return 'Informe o tipo do campo.'
  }

  const position = Number(form.position)

  if (!Number.isFinite(position)) {
    return 'A posicao deve ser um numero.'
  }

  if (form.type === 'select' && parseOptions(form.optionsText).length === 0) {
    return 'Informe pelo menos uma opcao para campos do tipo selecao.'
  }

  return null
}

function buildFieldPayload(form: LeadFieldFormState) {
  return {
    name: form.name.trim(),
    key: slugifyFieldKey(form.key),
    type: form.type,
    options: form.type === 'select' ? parseOptions(form.optionsText) : [],
    is_required: form.is_required,
    is_active: form.is_active,
    position: Number(form.position),
  }
}

type FieldFormProps = {
  form: LeadFieldFormState
  isDisabled?: boolean
  onChange: (form: LeadFieldFormState) => void
}

function FieldForm({ form, isDisabled = false, onChange }: FieldFormProps) {
  function updateField<FieldName extends keyof LeadFieldFormState>(
    fieldName: FieldName,
    value: LeadFieldFormState[FieldName],
  ) {
    onChange({
      ...form,
      [fieldName]: value,
    })
  }

  function updateName(value: string) {
    onChange({
      ...form,
      name: value,
      key: form.key ? form.key : slugifyFieldKey(value),
    })
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-field-name">
        <span>Nome do campo</span>
        <Input
          disabled={isDisabled}
          id="lead-field-name"
          onChange={(event) => updateName(event.target.value)}
          placeholder="Segmento"
          value={form.name}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-field-key">
        <span>Chave do campo</span>
        <Input
          disabled={isDisabled}
          id="lead-field-key"
          onChange={(event) => updateField('key', slugifyFieldKey(event.target.value))}
          placeholder="segmento"
          value={form.key}
        />
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-field-type">
        <span>Tipo</span>
        <Select
          disabled={isDisabled}
          id="lead-field-type"
          onChange={(event) => updateField('type', event.target.value as LeadCustomFieldType)}
          value={form.type}
        >
          {fieldTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </label>

      <label className="space-y-2 text-sm font-medium text-slate-700" htmlFor="lead-field-position">
        <span>Posicao</span>
        <Input
          disabled={isDisabled}
          id="lead-field-position"
          onChange={(event) => updateField('position', event.target.value)}
          type="number"
          value={form.position}
        />
      </label>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700" htmlFor="lead-field-required">
        <input
          checked={form.is_required}
          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
          disabled={isDisabled}
          id="lead-field-required"
          onChange={(event) => updateField('is_required', event.target.checked)}
          type="checkbox"
        />
        <span>Obrigatorio</span>
      </label>

      <label className="flex items-center gap-3 text-sm font-medium text-slate-700" htmlFor="lead-field-active">
        <input
          checked={form.is_active}
          className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950"
          disabled={isDisabled}
          id="lead-field-active"
          onChange={(event) => updateField('is_active', event.target.checked)}
          type="checkbox"
        />
        <span>Ativo</span>
      </label>

      {form.type === 'select' ? (
        <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2" htmlFor="lead-field-options">
          <span>Opcoes</span>
          <Textarea
            disabled={isDisabled}
            id="lead-field-options"
            onChange={(event) => updateField('optionsText', event.target.value)}
            placeholder={'SaaS\nServicos\nIndustria'}
            value={form.optionsText}
          />
        </label>
      ) : null}
    </div>
  )
}

export function LeadFieldsPage() {
  const { currentWorkspace, error: workspaceError, isLoading: isWorkspaceLoading } = useCurrentWorkspace()
  const { createField, deleteField, error, fields, isLoading, updateField } = useLeadCustomFields(
    currentWorkspace?.id,
    { includeInactive: true },
  )
  const [form, setForm] = useState<LeadFieldFormState>(emptyFieldForm)
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sortedFields = useMemo(
    () => [...fields].sort((first, second) => first.position - second.position),
    [fields],
  )

  function resetForm() {
    setForm(emptyFieldForm)
    setEditingFieldId(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setFeedbackMessage(null)

    if (!currentWorkspace) {
      setFormError('Workspace atual nao encontrado.')
      return
    }

    const validationError = validateFieldForm(form)

    if (validationError) {
      setFormError(validationError)
      return
    }

    const payload = buildFieldPayload(form)

    try {
      setIsSubmitting(true)

      if (editingFieldId) {
        const updatePayload: UpdateLeadCustomFieldInput = payload
        await updateField(editingFieldId, updatePayload)
        setFeedbackMessage('Campo atualizado com sucesso.')
      } else {
        const createPayload: CreateLeadCustomFieldInput = {
          workspace_id: currentWorkspace.id,
          ...payload,
        }
        await createField(createPayload)
        setFeedbackMessage('Campo criado com sucesso.')
      }

      resetForm()
    } catch (submitError) {
      setFormError(
        submitError instanceof Error ? submitError.message : 'Nao foi possivel salvar o campo personalizado.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function startEditing(field: LeadCustomField) {
    setEditingFieldId(field.id)
    setForm(getFormFromField(field))
    setFormError(null)
    setFeedbackMessage(null)
  }

  async function handleToggleActive(field: LeadCustomField) {
    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await updateField(field.id, { is_active: !field.is_active })
      setFeedbackMessage(field.is_active ? 'Campo desativado com sucesso.' : 'Campo ativado com sucesso.')
    } catch (toggleError) {
      setFormError(toggleError instanceof Error ? toggleError.message : 'Nao foi possivel alterar o status do campo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(field: LeadCustomField) {
    const shouldDelete = window.confirm(`Excluir o campo "${field.name}"?`)

    if (!shouldDelete) {
      return
    }

    setFormError(null)
    setFeedbackMessage(null)

    try {
      setIsSubmitting(true)
      await deleteField(field.id)
      if (editingFieldId === field.id) {
        resetForm()
      }
      setFeedbackMessage('Campo excluido com sucesso.')
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir o campo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isWorkspaceLoading) {
    return <p className="text-sm text-slate-600">Carregando workspace...</p>
  }

  if (workspaceError) {
    return <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{workspaceError}</p>
  }

  if (!currentWorkspace) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Nenhum workspace encontrado para configurar campos.
      </p>
    )
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Campos de Leads</h1>
        <p className="mt-2 text-sm text-slate-600">Workspace atual: {currentWorkspace.name}</p>
      </div>

      <Card className="space-y-5">
        <div>
          <h2 className="text-base font-semibold tracking-normal">
            {editingFieldId ? 'Editar campo personalizado' : 'Criar campo personalizado'}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Campos ativos aparecem automaticamente no formulario de leads.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <FieldForm form={form} isDisabled={isSubmitting} onChange={setForm} />

          {formError ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
          ) : null}

          {feedbackMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {feedbackMessage}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting
                ? 'Salvando...'
                : editingFieldId
                  ? 'Salvar alteracoes'
                  : 'Criar campo'}
            </Button>
            {editingFieldId ? (
              <Button
                className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                disabled={isSubmitting}
                onClick={resetForm}
                type="button"
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold tracking-normal">Campos configurados</h2>
          <p className="mt-1 text-sm text-slate-600">{sortedFields.length} campo(s) no workspace</p>
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {isLoading ? <p className="text-sm text-slate-600">Carregando campos personalizados...</p> : null}

        {!isLoading && sortedFields.length === 0 ? (
          <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-600">
            Nenhum campo personalizado configurado.
          </p>
        ) : null}

        <div className="space-y-3">
          {sortedFields.map((field) => (
            <div key={field.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words text-base font-semibold text-slate-950">{field.name}</p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                      {getFieldTypeLabel(field.type)}
                    </span>
                    <span
                      className={
                        field.is_active
                          ? 'rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700'
                          : 'rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600'
                      }
                    >
                      {field.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                    {field.is_required ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                        Obrigatorio
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                    <span>Key: {field.key}</span>
                    <span>Posicao: {field.position}</span>
                    <span>Tipo: {field.type}</span>
                  </div>

                  {field.options.length > 0 ? (
                    <p className="text-sm text-slate-600">Opcoes: {field.options.join(', ')}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    className="gap-2 bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                    disabled={isSubmitting}
                    onClick={() => startEditing(field)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Button>
                  <Button
                    className="bg-white text-slate-950 ring-1 ring-slate-200 hover:bg-slate-100"
                    disabled={isSubmitting}
                    onClick={() => void handleToggleActive(field)}
                  >
                    {field.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    className="gap-2 bg-red-600 hover:bg-red-700"
                    disabled={isSubmitting}
                    onClick={() => void handleDelete(field)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
