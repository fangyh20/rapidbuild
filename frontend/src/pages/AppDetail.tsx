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
  const [viewingVersion, setViewingVersion] = useState<string | null>(null)
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null)
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null)
  const [versionListRef, setVersionListRef] = useState<HTMLDivElement | null>(null)

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

  const { data: allComments } = useQuery({
    queryKey: ['comments', id],
    queryFn: async () => {
      const response = await api.getComments(id!)
      return response.data
    },
  })

  // Filter draft comments (status = 'draft' or no version_id)
  const draftComments = allComments?.filter((c: any) => c.status === 'draft' || !c.version_id)

  // Group comments by version_id for submitted comments
  const commentsByVersion = allComments?.reduce((acc: any, comment: any) => {
    if (comment.version_id) {
      if (!acc[comment.version_id]) {
        acc[comment.version_id] = []
      }
      acc[comment.version_id].push(comment)
    }
    return acc
  }, {})

  const addCommentMutation = useMutation({
    mutationFn: (data: { page_path: string; element_path: string; content: string }) =>
      api.addComment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      setCommentText('')
      setSelectedElement('')
      setShowCommentForm(false)
      setActionRequest('')
      setPopupPosition(null)

      // Re-launch element selector if in edit mode
      if (mode === 'edit' && iframeRef?.contentWindow) {
        setTimeout(() => {
          iframeRef.contentWindow?.postMessage({ type: 'LAUNCH_ELEMENT_SELECTOR' }, '*')
          console.log('[AppDetail] Re-launching element selector after comment submission')
        }, 100)
      }
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => api.deleteComment(id!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
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
    setPopupPosition(null)

    // Re-launch element selector if in edit mode
    if (mode === 'edit' && iframeRef?.contentWindow) {
      setTimeout(() => {
        iframeRef.contentWindow?.postMessage({ type: 'LAUNCH_ELEMENT_SELECTOR' }, '*')
        console.log('[AppDetail] Re-launching element selector after cancel')
      }, 100)
    }
  }

  const handlePreviewVersion = async (versionId: string) => {
    setViewingVersion(versionId)

    const version = versions?.find(v => v.id === versionId)

    // Only generate preview token for completed versions
    if (version?.status !== 'completed' || !version?.vercel_url) {
      setPreviewUrl(null)
      return
    }

    // Generate preview token
    try {
      const response = await api.generatePreviewToken(id!)
      const { token, previewUrl: baseUrl } = response.data

      // Append token to preview URL
      const urlWithToken = `${baseUrl}?token=${encodeURIComponent(token)}`
      setPreviewUrl(urlWithToken)
    } catch (error) {
      console.error('Failed to generate preview token:', error)
      // Fallback to normal URL without token
      if (version?.vercel_url) {
        setPreviewUrl(version.vercel_url)
      }
    }
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
  const latestCompletedVersion = versions?.slice().reverse().find(v => v.status === 'completed')
  const currentViewingVersion = versions?.find(v => v.id === viewingVersion)

  // Auto-select latest completed version on mount
  useEffect(() => {
    if (!viewingVersion && latestCompletedVersion) {
      handlePreviewVersion(latestCompletedVersion.id)
    } else if (!viewingVersion && latestVersion && (latestVersion.status === 'building' || latestVersion.status === 'pending')) {
      // If no completed version but latest is building, just set viewing version without preview
      setViewingVersion(latestVersion.id)
    }
  }, [latestCompletedVersion?.id, latestVersion?.id, viewingVersion])

  // Stream build progress if viewing version is building
  useEffect(() => {
    if (currentViewingVersion?.status === 'building' || currentViewingVersion?.status === 'pending') {
      const eventSource = api.streamBuildProgress(currentViewingVersion.id, (progress) => {
        setBuildProgress(progress)

        if (progress.status === 'completed' || progress.status === 'failed') {
          queryClient.invalidateQueries({ queryKey: ['versions', id] })
          queryClient.invalidateQueries({ queryKey: ['app', id] })
        }
      })

      return () => eventSource.close()
    } else {
      // Clear progress if not building
      setBuildProgress(null)
    }
  }, [currentViewingVersion?.id, currentViewingVersion?.status, id, queryClient])

  // Auto-load preview when viewing version completes building
  useEffect(() => {
    if (currentViewingVersion?.status === 'completed' && currentViewingVersion?.vercel_url && !previewUrl) {
      handlePreviewVersion(currentViewingVersion.id)
    }
  }, [currentViewingVersion?.status, currentViewingVersion?.vercel_url, currentViewingVersion?.id, previewUrl])

  // Enable/disable element picking in iframe when mode changes
  useEffect(() => {
    if (!iframeRef || !previewUrl) return

    const handleMessage = (event: MessageEvent) => {
      console.log('[AppDetail] Received message from iframe:', event.data)

      // Accept messages from iframe (element selector in deployed app)
      if (event.data.type === 'ELEMENT_SELECTED') {
        console.log('[AppDetail] Element selected:', event.data.selector)
        setSelectedElement(event.data.selector)
        setShowCommentForm(true)
        setActiveTab('action')

        // Calculate popup position based on iframe offset and mouse position
        if (iframeRef && event.data.mouseX !== undefined && event.data.mouseY !== undefined) {
          const iframeRect = iframeRef.getBoundingClientRect()
          setPopupPosition({
            x: iframeRect.left + event.data.mouseX,
            y: iframeRect.top + event.data.mouseY,
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [iframeRef, previewUrl])

  // Send message to iframe when mode changes
  useEffect(() => {
    if (!iframeRef?.contentWindow || !previewUrl) return

    // Wait for iframe to fully load before sending message
    const sendMessage = () => {
      try {
        if (mode === 'edit' && iframeRef?.contentWindow) {
          // Send message to launch element selector in deployed app
          console.log('[AppDetail] Sending LAUNCH_ELEMENT_SELECTOR to iframe')
          iframeRef.contentWindow.postMessage({ type: 'LAUNCH_ELEMENT_SELECTOR' }, '*')
        } else if (mode === 'view' && iframeRef?.contentWindow) {
          // Send message to stop element selector when switching to view mode
          console.log('[AppDetail] Sending STOP_ELEMENT_SELECTOR to iframe')
          iframeRef.contentWindow.postMessage({ type: 'STOP_ELEMENT_SELECTOR' }, '*')

          // Close any open comment form
          setShowCommentForm(false)
          setCommentText('')
          setSelectedElement('')
          setPopupPosition(null)
        }
      } catch (error) {
        console.error('[AppDetail] Failed to send message to iframe:', error)
      }
    }

    // If switching to edit mode, wait a bit for iframe to be ready
    if (mode === 'edit') {
      const timer = setTimeout(sendMessage, 500)
      return () => clearTimeout(timer)
    } else if (mode === 'view') {
      // Stop immediately when switching to view mode
      sendMessage()
    }
  }, [mode, iframeRef, previewUrl])

  // Auto-scroll version list to bottom to show latest version
  useEffect(() => {
    if (versionListRef && versions && versions.length > 0 && activeTab === 'action') {
      // Scroll to bottom after a short delay to ensure DOM is rendered
      setTimeout(() => {
        versionListRef.scrollTop = versionListRef.scrollHeight
      }, 100)
    }
  }, [versions?.length, versionListRef, activeTab])

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
          {previewUrl ? (
            <div className="h-full bg-white rounded-lg shadow relative">
              <iframe
                ref={setIframeRef}
                src={previewUrl}
                className="w-full h-full rounded-lg"
                title="App Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              />
            </div>
          ) : currentViewingVersion?.status === 'building' || currentViewingVersion?.status === 'pending' ? (
            <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Building your app...</h3>
                {buildProgress && (
                  <p className="mt-2 text-sm text-gray-600">{buildProgress.message}</p>
                )}
              </div>
            </div>
          ) : currentViewingVersion?.status === 'failed' ? (
            <div className="h-full flex items-center justify-center bg-white rounded-lg shadow">
              <div className="text-center max-w-md">
                <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Build Failed</h3>
                {currentViewingVersion.error_message && (
                  <p className="text-sm text-gray-600">{currentViewingVersion.error_message}</p>
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
              <div ref={setVersionListRef} className="flex-1 overflow-auto p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Version History</h3>
                <div className="space-y-3">
                  {versions?.slice().reverse().map((version: Version) => (
                    <div key={version.id} className="space-y-2">
                      {/* Comments or Requirements for this version */}
                      {version.version_number === 1 && version.requirements ? (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">Initial Requirements</h4>
                          <p className="text-xs text-gray-600 whitespace-pre-wrap">{version.requirements}</p>
                        </div>
                      ) : commentsByVersion?.[version.id] && commentsByVersion[version.id].length > 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <h4 className="text-xs font-semibold text-gray-700 mb-2">
                            Changes Requested ({commentsByVersion[version.id].length})
                          </h4>
                          <div className="space-y-2">
                            {commentsByVersion[version.id].map((comment: any) => (
                              <div key={comment.id} className="text-xs">
                                <span className="text-gray-500 font-mono">[{comment.element_path}]</span>
                                <p className="text-gray-700 mt-0.5">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Version Card */}
                      <div
                        className={`border rounded-lg p-2 transition-colors ${
                          viewingVersion === version.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1">
                            {getStatusIcon(version.status)}
                            <span className="text-sm font-medium text-gray-900">
                              Version {version.version_number}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(version.status)}`}>
                              {version.status}
                            </span>
                          </div>
                          {version.status === 'completed' && version.vercel_url && (
                            <button
                              onClick={() => handlePreviewVersion(version.id)}
                              className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                            >
                              View
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          {new Date(version.created_at).toLocaleString()}
                        </p>
                      </div>
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
                      <div key={comment.id} className="bg-white p-2 rounded shadow-sm relative group">
                        <button
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete comment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="text-xs text-gray-500 mb-1 pr-6">[{comment.element_path}]</div>
                        <div className="text-sm text-gray-900 pr-6">{comment.content}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
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

      {/* Floating Comment Popup (appears at click position) */}
      {showCommentForm && popupPosition && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={handleCancelComment}
          />

          {/* Popup */}
          <div
            className="fixed z-50 bg-white rounded-lg shadow-2xl border-2 border-blue-500"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              transform: 'translate(-50%, -20px)',
              minWidth: '320px',
              maxWidth: '400px',
            }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  <h4 className="text-sm font-semibold text-gray-900">Add Comment</h4>
                </div>
                <button
                  onClick={handleCancelComment}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Describe the change you want..."
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleCancelComment}
                    className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                  >
                    {addCommentMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
