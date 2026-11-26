export interface AuthProfile {
  first_name?: string
  middle_names?: string | null
  first_surname?: string
  second_surname?: string
  identification?: string
  birth_date?: string | null
}

export interface AuthUser {
  id: number
  name: string
  username: string
  email: string
  roles?: string[]
  permissions?: string[]
  profile?: AuthProfile | null
  failed_login_attempts?: number
  last_login_at?: string | null
}

export interface NavigationItem {
  icon_key: string
  label: string
  route_name: string
}
