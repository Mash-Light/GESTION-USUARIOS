import { request } from '../../shared/api/httpClient.js'

export async function importPeople(file) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await request('/api/imports', { method: 'POST', body: formData })
  return response.data
}
