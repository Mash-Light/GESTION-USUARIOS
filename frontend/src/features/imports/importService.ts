import { request } from '../../shared/api/httpClient'

export interface ImportRowResult {
  row_number: number
  status: 'created' | 'failed'
  errors?: Record<string, string[]>
}

export interface ImportBatch {
  id: number
  status: 'completed' | 'partial' | 'failed'
  success_rows: number
  error_rows: number
  total_rows: number
  rows: ImportRowResult[]
}

export async function importPeople(file: File): Promise<ImportBatch> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await request('/api/imports', { method: 'POST', body: formData })
  return response.data as ImportBatch
}
