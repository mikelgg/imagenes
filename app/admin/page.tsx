'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Eye, Shield, RefreshCw, AlertCircle } from 'lucide-react'
import { formatFileSize, formatDuration } from '@/lib/utils'
import Link from 'next/link'

interface TempObject {
  key: string
  size: number
  lastModified?: string
  signedUrl: string
  expiresAt: string
  isExpired: boolean
}

interface ApiResponse {
  objects: TempObject[]
  total: number
  message?: string
}

export default function AdminPage() {
  const [token, setToken] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [objects, setObjects] = useState<TempObject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const authenticate = () => {
    if (token.trim()) {
      setIsAuthenticated(true)
      loadObjects()
    } else {
      setError('Please enter admin token')
    }
  }

  const loadObjects = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/temp-list?token=${encodeURIComponent(token)}`)
      
      if (response.status === 401) {
        setError('Invalid admin token')
        setIsAuthenticated(false)
        return
      }
      
      if (!response.ok) {
        throw new Error('Failed to load objects')
      }
      
      const data: ApiResponse = await response.json()
      setObjects(data.objects || [])
      
      if (data.message) {
        setError(data.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const deleteObject = async (key: string) => {
    if (!confirm('Are you sure you want to delete this object?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/temp-delete?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete object')
      }
      
      // Remove from local state
      setObjects(prev => prev.filter(obj => obj.key !== key))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const expires = new Date(expiresAt)
    const now = new Date()
    const diff = expires.getTime() - now.getTime()
    
    if (diff <= 0) {
      return 'Expired'
    }
    
    return formatDuration(diff)
  }

  useEffect(() => {
    // Auto-refresh every 30 seconds if authenticated
    if (isAuthenticated) {
      const interval = setInterval(loadObjects, 30000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated, token])

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="token">Admin Token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter admin token"
                onKeyDown={(e) => e.key === 'Enter' && authenticate()}
              />
            </div>
            
            {error && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            
            <Button onClick={authenticate} className="w-full">
              Access Admin Panel
            </Button>
            
            <div className="text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:underline">
                ← Back to Image Processor
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">
            Manage temporary image storage
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={loadObjects}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Link href="/">
            <Button variant="ghost">← Back to App</Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="font-medium">Error</span>
          </div>
          <p className="text-sm text-destructive mt-1">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Temporary Images ({objects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading objects...</p>
            </div>
          ) : objects.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No temporary images found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {objects.map((object) => (
                <div
                  key={object.key}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    object.isExpired ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/30'
                  }`}
                >
                  {/* Preview */}
                  <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img
                      src={object.signedUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{object.key}</div>
                    <div className="text-sm text-muted-foreground">
                      Size: {formatFileSize(object.size)} • 
                      Expires: {formatTimeRemaining(object.expiresAt)}
                      {object.isExpired && (
                        <span className="text-destructive font-medium"> (EXPIRED)</span>
                      )}
                    </div>
                    {object.lastModified && (
                      <div className="text-xs text-muted-foreground">
                        Uploaded: {new Date(object.lastModified).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(object.signedUrl, '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteObject(object.key)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Images are automatically deleted after 24 hours. 
          Manual deletion is available for immediate cleanup.
        </p>
      </div>
    </div>
  )
}
