import { ApiError } from '@/shared/api'
import type { RollbackDto } from '@/types/operations'

const PATH = 'RollbackApi'

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null)

function toRollback(raw: unknown): RollbackDto | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as Record<string, unknown>
  if (typeof item.id !== 'number' || !Number.isInteger(item.id)) return null
  return {
    id: item.id,
    entityType: text(item.entityType),
    date: text(item.date),
    displayDate: text(item.displayDate),
  }
}

// GET api/RollbackApi always answers with a list (RollbackApiController.cs:30-34); anything else is a failure, not "no batches".
export function parseRollbacks(raw: unknown): RollbackDto[] {
  if (!Array.isArray(raw)) throw new ApiError('parse', PATH)
  const items = raw.map(toRollback)
  if (items.some(item => item === null)) throw new ApiError('parse', PATH)
  return items as RollbackDto[]
}
