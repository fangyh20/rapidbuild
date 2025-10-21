import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, type App } from '@/lib/api'
import { authClient } from '@/lib/auth'
import { useAuthStore } from '@/lib/store'
import { Plus, Folder, Clock, AlertCircle } from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()

  useEffect(() => {
    let isMounted = true

    // Check if user is authenticated
    const checkAuth = async () => {
      const currentUser = await authClient.getCurrentUser()

      if (!isMounted) {
        return
      }

      if (!currentUser) {
        navigate('/login')
      } else {
        setUser(currentUser)
      }
    }

    checkAuth()

    return () => {
      isMounted = false
    }
  }, [])

  const { data: apps, isLoading, error } = useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const response = await api.getApps()
      return response.data
    },
    enabled: !!user, // Only fetch apps after user is authenticated
  })

  const handleLogout = async () => {
    await authClient.logout()
    setUser(null)
    navigate('/login')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'building':
        return 'bg-blue-100 text-blue-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">RapidBuild</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">My Apps</h2>
          <Link
            to="/apps/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New App
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">Failed to load apps</p>
            </div>
          </div>
        ) : apps && apps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app: App) => (
              <Link
                key={app.id}
                to={`/apps/${app.id}`}
                className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-blue-100 rounded-lg p-3">
                      <Folder className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-2">{app.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{app.description}</p>

                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  {new Date(app.created_at).toLocaleDateString()}
                </div>

                {app.prod_version && (
                  <div className="mt-2 text-xs text-gray-500">
                    Production: v{app.prod_version}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No apps</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating a new app.</p>
            <div className="mt-6">
              <Link
                to="/apps/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create App
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
