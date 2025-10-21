import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/lib/store'
import { authClient } from '@/lib/auth'

export function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      // Check for error in query params
      const errorParam = searchParams.get('error')
      if (errorParam) {
        setError('Google authentication failed: ' + errorParam)
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      // Extract tokens from URL fragment (after #)
      const hash = window.location.hash.substring(1) // Remove the # character
      const params = new URLSearchParams(hash)

      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const userId = params.get('user_id')
      const email = params.get('email')
      const fullName = params.get('full_name') || ''

      if (!accessToken || !refreshToken) {
        setError('Missing authentication tokens')
        setTimeout(() => navigate('/login'), 3000)
        return
      }

      // Store tokens in authClient
      const user = {
        id: userId || '',
        email: email || '',
        full_name: fullName,
        email_verified: true,
        created_at: new Date().toISOString(),
      }

      // Use authClient.setSession to update both localStorage and internal state
      authClient.setSession(accessToken, refreshToken, user)

      // Update global state
      setUser(user)

      // Clear the hash from URL for security
      window.history.replaceState(null, '', window.location.pathname)

      // Redirect to dashboard
      navigate('/dashboard')
    }

    handleCallback()
  }, [searchParams, navigate, setUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          {error ? (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Authentication Failed</h2>
              <p className="mt-2 text-gray-600">{error}</p>
            </>
          ) : (
            <>
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 animate-pulse">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Completing Sign In...</h2>
              <p className="mt-2 text-gray-600">Please wait while we complete your authentication.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
