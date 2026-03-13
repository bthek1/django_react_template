export interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  date_joined: string
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface RegisterPayload {
  email: string
  username: string
  password: string
}

export interface LoginPayload {
  username: string
  password: string
}
