import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'

export function NewApp() {
  const navigate = useNavigate()
  const [requirements, setRequirements] = useState('')

  // Get existing apps to generate name
  const { data: apps } = useQuery({
    queryKey: ['apps'],
    queryFn: async () => {
      const response = await api.getApps()
      return response.data
    },
  })

  const createAppMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; requirements: string }) => {
      const response = await api.createApp(data)
      return response.data
    },
    onSuccess: (data) => {
      navigate(`/apps/${data.app.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-generate app name
    const appCount = (apps?.length || 0) + 1
    const name = `App ${appCount}`

    createAppMutation.mutate({
      name,
      description: '',
      requirements
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">What do you want to build?</h1>
            <p className="mt-2 text-sm text-gray-600">
              Describe your app and we'll build it for you. Be as detailed as possible.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                required
                autoFocus
                rows={16}
                className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder={`Example:

Build a task management app with:

Features:
- Add, edit, and delete tasks
- Mark tasks as complete
- Filter by status (all, active, completed)
- Search tasks by name

Design:
- Clean, modern interface
- Use purple as primary color
- Mobile-responsive

Pages:
- Main task list page
- Add/edit task form`}
              />
            </div>

            <div className="flex justify-between items-center pt-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createAppMutation.isPending || !requirements.trim()}
                className="px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createAppMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Building...
                  </span>
                ) : (
                  'Build My App'
                )}
              </button>
            </div>

            {createAppMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                Failed to create app. Please try again.
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
