export interface ManagedPerson {
  id: number
  first_name: string
  middle_names: string | null
  first_surname: string
  second_surname: string
  identification: string
  birth_date: string | null
  user: {
    id: number
    username: string
    email: string
    role: string
    status: string
    locked_at: string | null
    last_login_at: string | null
  }
}

export interface PeopleFilters {
  search: string
  status: string
  sort: string
  direction: 'asc' | 'desc'
  page: number
  per_page: number
}

export interface PeopleResult {
  people: ManagedPerson[]
  pagination: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface PersonPayload {
  first_name: string
  middle_names: string
  first_surname: string
  second_surname: string
  identification: string
  birth_date: string
  username: string
  password?: string
  role: 'member'
  status: 'active' | 'inactive'
}
