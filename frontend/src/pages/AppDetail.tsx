import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type Version, type BuildProgress } from '@/lib/api'
import {
  ArrowLeft,
  Eye,
  Edit2,
  MessageCircle,
  Activity,
  Trash2,
  Send,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'

export function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [activeTab, setActiveTab] = useState<'action' | 'chat'>('action')
  const [selectedElement, setSelectedElement] = useState<string>('')
  const [commentText, setCommentText] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [actionRequest, setActionRequest] = useState('')
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null)

  const { data: app } = useQuery({
    queryKey: ['app', id],
    queryFn: async () => {
      const response = await api.getApp(id!)
      return response.data
    },
  })

  const { data: versions } = useQuery({
    queryKey: ['versions', id],
    queryFn: async () => {
      const response = await api.getVersions(id!)
      return response.data
    },
  })

  const { data: draftComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const response = await api.getComments(id!)
      return response.data
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: (data: { page_path: string; element_path: string; content: string }) =>
      api.addComment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      setCommentText('')
      setSelectedElement('')
      setShowCommentForm(false)
      setActionRequest('')
    },
  })

  const createVersionMutation = useMutation({
    mutationFn: (commentIds: string[]) =>
      api.createVersion(id!, commentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['versions', id] })
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      setCommentText('')
      setSelectedElement('')
    },
  })

  const deleteAppMutation = useMutation({
    mutationFn: () => api.deleteApp(id!),
    onSuccess: () => {
      navigate('/dashboard')
    },
  })

  const handleCancelComment = () => {
    setCommentText('')
    setSelectedElement('')
    setShowCommentForm(false)
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return

    addCommentMutation.mutate({
      page_path: '/',
      element_path: selectedElement || 'general',
      content: commentText,
    })
  }

  const handleSendAllComments = () => {
    if (!draftComments || draftComments.length === 0) return

    // Extract comment IDs
    const commentIds = draftComments.map((c: any) => c.id)
    createVersionMutation.mutate(commentIds)
  }

  const handleAddActionRequest = () => {
    if (!actionRequest.trim()) return

    // Add general page/app scope comment (no specific element)
    addCommentMutation.mutate({
      page_path: '/',
      element_path: 'general',
      content: actionRequest,
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'building':
      case 'pending':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'building':
      case 'pending':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const latestVersion = versions?.[versions.length - 1]

  // Stream build progress if latest version is building
  useEffect(() => {
    if (latestVersion?.status === 'building' || latestVersion?.status === 'pending') {
      const eventSource = api.streamBuildProgress(latestVersion.id, (progress) => {
        setBuildProgress(progress)

        if (progress.status === 'completed' || progress.status === 'failed') {
          queryClient.invalidateQueries({ queryKey: ['versions', id] })
        }
      })

      return () => eventSource.close()
    }
  }, [latestVersion?.id, latestVersion?.status, id, queryClient])

  // Enable/disable element picking in iframe when mode changes
  useEffect(() => {
    if (!iframeRef || !latestVersion?.vercel_url) return

    const handleMessage = (event: MessageEvent) => {
      // Accept messages from iframe (element selector in deployed app)
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.selector)
        setShowCommentForm(true)
        setActiveTab('action')
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [iframeRef, latestVersion?.vercel_url])

  // Send message to iframe when mode changes
  useEffect(() => {
    if (!iframeRef?.contentWindow) return

    try {
      if (mode === 'edit') {
        iframeRef.contentWindow.postMessage({ type: 'LAUNCH_ELEMENT_SELECTOR' }, '*')
      } else {
        iframeRef.contentWindow.postMessage({ type: 'STOP_ELEMENT_SELECTOR' }, '*')
      }
    } catch (error) {
      console.error('Failed to send message to iframe:', error)
    }
  }, [mode, iframeRef])

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <nav className="bg-white shadow-sm flex-shrink-0">
        <div className="max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back
              </button>
              <h1 className="text-xl font-bold text-gray-900">{app?.name}</h1>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-md">
                <button
                  onClick={() => setMode('view')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    mode === 'view'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="h-4 w-4 inline mr-2" />
                  View
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    mode === 'edit'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit2 className="h-4 w-4 inline mr-2" />
                  Edit
                </button>
              </div>

              <button
                onClick={() => deleteAppMutation.mutate()}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4 inline mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* App Preview */}
        <div className="flex-1 bg-gray-100 p-4 overflow-auto">
          {latestVersion?.vercel_url ? (
            <div className="h-full bg-white rounded-lg shadow relative">
              {mode === 'edit' && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-sm py-2 px-4 z-10 flex items-center justify-center">
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Mode: Click on any element to add a comment
                </div>
              )}
              <iframe
                ref={setIframeRef}
                src={latestVersion.vercel_url}
                className={`w-full h-full rounded-lg ${mode === 'edit' ? 'mt-10' : ''}`}
                title="App Preview"
              />
            </div>
          ) : latestVersion?.status === 'building' || latestVersion?.status === 'pending' ? (
            <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Building your app...</h3>
                {buildProgress && (
                  <p className="mt-2 text-sm text-gray-600">{buildProgress.message}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
              <div className="text-center">
                <p className="text-gray-500">No preview available yet</p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-96 bg-white border-l flex flex-col">
          {/* Tabs */}
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('action')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'action'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <Activity className="h-4 w-4 inline mr-2" />
                Action
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'chat'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="h-4 w-4 inline mr-2" />
                Chat
              </button>
            </div>
          </div>

          {/* Action Tab */}
          {activeTab === 'action' && (
            <>
              {/* Version History */}
              <div className="flex-1 overflow-auto p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
                <div className="space-y-3">
                  {versions?.slice().reverse().map((version: Version) => (
                    <div
                      key={version.id}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        selectedVersion === version.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedVersion(selectedVersion === version.id ? null : version.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(version.status)}
                          <span className="text-sm font-medium text-gray-900">
                            Version {version.version_number}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(version.status)}`}>
                          {version.status}
                        </span>
                      </div>

                      {version.vercel_url && (
                        <a
                          href={version.vercel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center mb-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View deployment
                        </a>
                      )}

                      <p className="text-xs text-gray-500">
                        {new Date(version.created_at).toLocaleString()}
                      </p>

                      {/* Expanded version details */}
                      {selectedVersion === version.id && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {/* Build Log */}
                          {version.build_log && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-1">Build Log:</h4>
                              <div className="bg-gray-900 text-gray-100 text-xs p-2 rounded max-h-40 overflow-auto font-mono">
                                {version.build_log}
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {version.error_message && (
                            <div>
                              <h4 className="text-xs font-medium text-red-700 mb-1">Error:</h4>
                              <div className="bg-red-50 text-red-900 text-xs p-2 rounded">
                                {version.error_message}
                              </div>
                            </div>
                          )}

                          {/* Requirements */}
                          {version.requirements && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-1">Requirements:</h4>
                              <div className="bg-gray-50 text-gray-900 text-xs p-2 rounded">
                                {version.requirements}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {(!versions || versions.length === 0) && (
                    <p className="text-sm text-gray-500 text-center py-8">No versions yet</p>
                  )}
                </div>
              </div>

              {/* Draft Comments Display */}
              {draftComments && draftComments.length > 0 && (
                <div className="border-t p-3 bg-yellow-50 max-h-40 overflow-auto">
                  <h4 className="text-xs font-medium text-gray-900 mb-2">
                    Draft Comments ({draftComments.length})
                  </h4>
                  <div className="space-y-2">
                    {draftComments.map((comment: any) => (
                      <div key={comment.id} className="bg-white p-2 rounded shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">[{comment.element_path}]</div>
                        <div className="text-sm text-gray-900">{comment.content}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Element Comment Input (shown when element is selected) */}
              {showCommentForm && (
                <div className="border-t p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Element Comment</h4>
                    <button
                      onClick={handleCancelComment}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Selected Element</label>
                      <input
                        type="text"
                        value={selectedElement}
                        onChange={(e) => setSelectedElement(e.target.value)}
                        placeholder="Element selector"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Comment</label>
                      <textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Describe the change you want..."
                        rows={3}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        autoFocus
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancelComment}
                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddComment}
                        disabled={!commentText.trim() || addCommentMutation.isPending}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                      >
                        {addCommentMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add Comment
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* General Action Request Input (always visible at bottom) */}
              <div className="border-t p-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2">Page/App Action Request</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={actionRequest}
                        onChange={(e) => setActionRequest(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleAddActionRequest()
                          }
                        }}
                        placeholder="Add a new page, change color scheme, etc..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      <button
                        onClick={handleAddActionRequest}
                        disabled={!actionRequest.trim() || addCommentMutation.isPending}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Build Version Button */}
                  {draftComments && draftComments.length > 0 && (
                    <button
                      onClick={handleSendAllComments}
                      disabled={createVersionMutation.isPending}
                      className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                    >
                      {createVersionMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Building...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Build Version ({draftComments.length} comments)
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <>
              {/* Chat History */}
              <div className="flex-1 overflow-auto p-4">
                <div className="text-center text-sm text-gray-500 py-8">
                  Chat history coming soon...
                </div>
              </div>

              {/* Chat Input */}
              <div className="border-t p-4">
                <div className="space-y-3">
                  <textarea
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault()
                        // TODO: Handle send chat message
                      }
                    }}
                    placeholder="Chat with AI about your app... (Ctrl+Enter to send)"
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    disabled={!chatMessage.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
