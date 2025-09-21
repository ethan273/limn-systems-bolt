'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ArrowLeft, Save, X } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

interface EditPageTemplateProps<T = Record<string, unknown>> {
  title: string
  breadcrumbs: Array<{ label: string; href?: string }>
  data: T | null
  loading: boolean
  saving: boolean
  error: string | null
  children: React.ReactNode
  onSave: (data: T) => Promise<void>
  onCancel: () => void
  backUrl: string
}

export function EditPageTemplate<T = Record<string, unknown>>({
  title,
  breadcrumbs,
  data,
  loading,
  saving,
  error,
  children,
  onSave,
  onCancel,
  backUrl
}: EditPageTemplateProps<T>) {
  const router = useRouter()

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="h-4 bg-stone-200 rounded w-1/3 animate-pulse"></div>
        
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-stone-200 rounded w-1/4 animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-9 w-20 bg-stone-200 rounded animate-pulse"></div>
            <div className="h-9 w-20 bg-stone-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-6 bg-stone-200 rounded w-1/4 animate-pulse"></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-stone-200 rounded w-1/6 animate-pulse"></div>
                <div className="h-10 bg-stone-200 rounded animate-pulse"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbs} />

        <Alert>
          <X className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Not Found</h4>
            <p className="text-sm text-slate-600 mt-1">
              The requested item could not be found.
            </p>
          </div>
        </Alert>

        <Button 
          variant="outline" 
          onClick={() => router.push(backUrl)}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Go Back</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbs} />

      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(backUrl)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back</span>
          </Button>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => onSave(data)}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error">
          <X className="h-4 w-4" />
          <div>
            <h4 className="font-medium">Error</h4>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </Alert>
      )}

      {/* Form Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  )
}