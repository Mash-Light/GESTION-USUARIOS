import { request } from '../../shared/api/httpClient.js'

export async function listPeople(filters, { signal } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) query.set(key, value)
  }

  const response = await request(`/api/people?${query}`, { signal })
  return { people: response.data, pagination: response.meta }
}

export async function createPerson(data) {
  return request('/api/people', { method: 'POST', body: JSON.stringify(data) })
}

export async function updatePerson(id, data) {
  return request(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deletePerson(id) {
  return request(`/api/people/${id}`, { method: 'DELETE' })
}

export async function unlockPerson(id) {
  return request(`/api/people/${id}/unlock`, { method: 'POST' })
}
