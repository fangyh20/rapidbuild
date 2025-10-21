import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8092/api/v1'

export interface User {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  email_verified: boolean
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  user: User
}

class AuthClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private user: User | null = null

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('access_token')
    this.refreshToken = localStorage.getItem('refresh_token')
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        this.user = JSON.parse(userStr)
      } catch (e) {
        console.error('Error parsing user from localStorage:', e)
      }
    }
  }

  // Sign up with email and password
  async signup(email: string, password: string, fullName: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, {
      email,
      password,
      full_name: fullName,
    })
    return response.data
  }

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    })

    const { access_token, refresh_token, user } = response.data

    // Store tokens and user
    this.setSession(access_token, refresh_token, user)

    return response.data
  }

  // Logout
  async logout() {
    try {
      // Call logout endpoint
      await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
        headers: this.getAuthHeaders(),
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local session
      this.clearSession()
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User | null> {
    // Reload from localStorage if internal state is missing (handles HMR/reload issues)
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('access_token')
      this.refreshToken = localStorage.getItem('refresh_token')
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          this.user = JSON.parse(userStr)
        } catch (e) {
          console.error('Error parsing user from localStorage:', e)
        }
      }
    }

    if (!this.accessToken) {
      return null
    }

    try {
      const response = await axios.get<User>(`${API_BASE_URL}/auth/me`, {
        headers: this.getAuthHeaders(),
      })
      this.user = response.data
      localStorage.setItem('user', JSON.stringify(this.user))
      return this.user
    } catch (error: any) {
      // Token might be expired, try to refresh
      if (this.refreshToken) {
        const refreshed = await this.refreshAccessToken()
        if (refreshed) {
          return this.getCurrentUser()
        }
      }
      this.clearSession()
      return null
    }
  }

  // Refresh access token
  async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      return false
    }

    try {
      const response = await axios.post<{ access_token: string }>(
        `${API_BASE_URL}/auth/refresh`,
        { refresh_token: this.refreshToken }
      )

      this.accessToken = response.data.access_token
      localStorage.setItem('access_token', this.accessToken)
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      this.clearSession()
      return false
    }
  }

  // Verify email
  async verifyEmail(token: string) {
    const response = await axios.get(`${API_BASE_URL}/auth/verify-email?token=${token}`)
    return response.data
  }

  // Forgot password
  async forgotPassword(email: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email })
    return response.data
  }

  // Reset password
  async resetPassword(token: string, newPassword: string) {
    const response = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      token,
      new_password: newPassword,
    })
    return response.data
  }

  // Google OAuth
  getGoogleAuthUrl(): string {
    return `${API_BASE_URL}/auth/google`
  }

  // Set session (public for OAuth callback)
  setSession(accessToken: string, refreshToken: string, user: User) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    this.user = user

    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
  }

  // Clear session
  private clearSession() {
    this.accessToken = null
    this.refreshToken = null
    this.user = null

    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  }

  // Get auth headers
  getAuthHeaders(): Record<string, string> {
    if (this.accessToken) {
      return {
        Authorization: `Bearer ${this.accessToken}`,
      }
    }
    return {}
  }

  // Get access token
  getAccessToken(): string | null {
    return this.accessToken
  }

  // Get current user (cached)
  getUser(): User | null {
    return this.user
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.accessToken && !!this.user
  }
}

export const authClient = new AuthClient()
