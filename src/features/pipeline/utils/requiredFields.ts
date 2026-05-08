import type { Lead } from '../../leads/types/lead.types'
import type { PipelineStage, RequiredFieldRule } from '../types/pipeline.types'

type LeadRequiredFieldSource = Pick<
  Lead,
  'name' | 'email' | 'phone' | 'company' | 'job_title' | 'source' | 'notes' | 'custom_fields'
>

const standardLeadFieldKeys = ['name', 'email', 'phone', 'company', 'job_title', 'source', 'notes'] as const

export type StandardLeadFieldKey = (typeof standardLeadFieldKeys)[number]

export const standardLeadRequiredFieldOptions: RequiredFieldRule[] = [
  { type: 'standard', key: 'name', label: 'Nome' },
  { type: 'standard', key: 'email', label: 'Email' },
  { type: 'standard', key: 'phone', label: 'Telefone' },
  { type: 'standard', key: 'company', label: 'Empresa' },
  { type: 'standard', key: 'job_title', label: 'Cargo' },
  { type: 'standard', key: 'source', label: 'Origem' },
  { type: 'standard', key: 'notes', label: 'Observacoes' },
]

function isStandardLeadFieldKey(key: string): key is StandardLeadFieldKey {
  return standardLeadFieldKeys.includes(key as StandardLeadFieldKey)
}

function isEmptyRequiredValue(value: unknown) {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }

  if (Array.isArray(value)) {
    return value.length === 0
  }

  return false
}

export function getMissingRequiredFieldLabels(
  lead: LeadRequiredFieldSource,
  requiredFields: RequiredFieldRule[],
) {
  return requiredFields
    .filter((field) => {
      if (field.type === 'standard') {
        if (!isStandardLeadFieldKey(field.key)) {
          return false
        }

        return isEmptyRequiredValue(lead[field.key])
      }

      return isEmptyRequiredValue(lead.custom_fields[field.key])
    })
    .map((field) => field.label)
}

export function validateLeadStageTransition(lead: LeadRequiredFieldSource, targetStage: PipelineStage) {
  const missingLabels = getMissingRequiredFieldLabels(lead, targetStage.required_fields)

  if (missingLabels.length === 0) {
    return null
  }

  return `Para mover para ${targetStage.name}, preencha: ${missingLabels.join(', ')}.`
}
