'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { ArrowLeft, X, Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

interface CreatePageTemplateProps<T = Record<string, unknown>> {
  title: string
  breadcrumbs: Array<{ label: string; href?: string }>
  data: Partial<T>
  saving: boolean
  error: string | null
  children: React.ReactNode
  onCreate: (data: Partial<T>) => Promise<void>
  onCancel: () => void
  backUrl: string
}

export function CreatePageTemplate<T = Record<string, unknown>>({
  title,
  breadcrumbs,
  data,
  saving,
  error,
  children,
  onCreate,
  onCancel,
  backUrl
}: CreatePageTemplateProps<T>) {
  const router = useRouter()

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
            onClick={() => onCreate(data)}
            disabled={saving}
            className="flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Creating...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Create</span>
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