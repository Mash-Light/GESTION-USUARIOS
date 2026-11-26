import { request } from '../../shared/api/httpClient'
import type { ManagedPerson, PeopleFilters, PeopleResult, PersonPayload } from './people.types'

export async function listPeople(filters: PeopleFilters, { signal }: { signal?: AbortSignal } = {}): Promise<PeopleResult> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, String(value))
  }

  const response = await request(`/api/people?${query}`, { signal })
  return { people: response.data, pagination: response.meta }
}

export function createPerson(data: PersonPayload) {
  return request('/api/people', { method: 'POST', body: JSON.stringify(data) })
}

export function updatePerson(id: number, data: Partial<PersonPayload>) {
  return request(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export function deletePerson(id: number) {
  return request(`/api/people/${id}`, { method: 'DELETE' })
}

export async function unlockPerson(id: number): Promise<{ data: ManagedPerson }> {
  return request(`/api/people/${id}/unlock`, { method: 'POST' }) as Promise<{ data: ManagedPerson }>
}
