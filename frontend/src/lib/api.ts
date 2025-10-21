import axios from 'axios'
import { authClient } from './auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8092/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  const accessToken = authClient.getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

// Handle 401 errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // If 401 and we haven't retried yet, try to refresh the token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshed = await authClient.refreshAccessToken()

      if (refreshed) {
        const accessToken = authClient.getAccessToken()
        if (accessToken) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        }
      }
    }

    return Promise.reject(error)
  }
)

// API Types
export interface App {
  id: string
  user_id: string
  name: string
  description: string
  status: string
  prod_version?: number
  created_at: string
  updated_at: string
}

export interface Version {
  id: string
  app_id: string
  version_number: number
  status: string
  requirements?: string
  s3_code_path?: string
  vercel_url?: string
  vercel_deploy_id?: string
  build_log?: string
  error_message?: string
  created_at: string
  completed_at?: string
}

export interface Comment {
  id: string
  app_id: string
  version_id?: string
  user_id: string
  page_path: string
  element_path: string
  content: string
  status: string
  created_at: string
  submitted_at?: string
}

export interface BuildProgress {
  version_id: string
  status: string
  message: string
  timestamp: string
}

// API Functions
export const api = {
  // Apps
  getApps: () => apiClient.get<App[]>('/apps'),
  getApp: (id: string) => apiClient.get<App>(`/apps/${id}`),
  createApp: (data: { name: string; description: string; requirements: string; files?: string[] }) =>
    apiClient.post<{ app: App; version: Version }>('/apps', data),
  deleteApp: (id: string) => apiClient.delete(`/apps/${id}`),

  // Versions
  getVersions: (appId: string) => apiClient.get<Version[]>(`/apps/${appId}/versions`),
  getVersion: (appId: string, versionId: string) =>
    apiClient.get<Version>(`/apps/${appId}/versions/${versionId}`),
  createVersion: (appId: string, commentIds: string[]) =>
    apiClient.post<Version>(`/apps/${appId}/versions`, { comments: commentIds }),
  deleteVersion: (appId: string, versionId: string) =>
    apiClient.delete(`/apps/${appId}/versions/${versionId}`),
  promoteVersion: (appId: string, versionId: string) =>
    apiClient.post(`/apps/${appId}/versions/${versionId}/promote`),

  // Comments
  getComments: (appId: string) => apiClient.get<Comment[]>(`/apps/${appId}/comments`),
  addComment: (appId: string, data: { page_path: string; element_path: string; content: string }) =>
    apiClient.post<Comment>(`/apps/${appId}/comments`, data),
  deleteComment: (appId: string, commentId: string) =>
    apiClient.delete(`/apps/${appId}/comments/${commentId}`),
  getVersionComments: (appId: string, versionId: string) =>
    apiClient.get<Comment[]>(`/apps/${appId}/versions/${versionId}/comments`),

  // SSE for build progress
  streamBuildProgress: (versionId: string, onMessage: (progress: BuildProgress) => void) => {
    const token = authClient.getAccessToken()
    const url = `${API_BASE_URL}/versions/${versionId}/progress${token ? `?token=${encodeURIComponent(token)}` : ''}`
    const eventSource = new EventSource(url)

    eventSource.onmessage = (event) => {
      try {
        const progress = JSON.parse(event.data)
        onMessage(progress)

        if (progress.status === 'completed' || progress.status === 'failed') {
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    return eventSource
  },
}
