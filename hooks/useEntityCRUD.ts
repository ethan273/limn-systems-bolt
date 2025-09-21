'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface EntityCRUDOptions {
  tableName: string
  backUrl: string
  successMessage?: string
  errorMessage?: string
}

export function useEntityCRUD<T = Record<string, unknown>>(id: string, options: EntityCRUDOptions) {
  const [data, setData] = useState<T | null>(null)
  const [editData, setEditData] = useState<Partial<T>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Fetch single entity
  const fetchEntity = useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)

    try {
      const { data: result, error: fetchError } = await supabase
        .from(options.tableName)
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setData(result)
      setEditData(result)
    } catch (err: unknown) {
      console.error(`Error fetching ${options.tableName}:`, err)
      setError(err instanceof Error ? err.message : `Failed to fetch ${options.tableName}`)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [id, options.tableName, supabase])

  // Save entity changes
  const saveEntity = useCallback(async (updatedData: Partial<T>) => {
    if (!id || !updatedData) return

    setSaving(true)
    setError(null)

    try {
      const { data: result, error: saveError } = await supabase
        .from(options.tableName)
        .update(updatedData)
        .eq('id', id)
        .select()
        .single()

      if (saveError) {
        throw new Error(saveError.message)
      }

      setData(result)
      setEditData(result)
      
      // Invalidate cache for the API endpoint to force fresh data
      try {
        await fetch(`/api/${options.tableName}?_cache_bust=${Date.now()}`, { method: 'HEAD' })
      } catch {
        // Cache invalidation failed, but continue anyway
      }
      
      // Show success message or navigate back
      if (options.successMessage) {
        // You could implement a toast system here
        console.log(options.successMessage)
      }
      
      // Navigate back to list view with a cache busting parameter
      const backUrlWithRefresh = `${options.backUrl}?updated=${Date.now()}`
      router.push(backUrlWithRefresh)
      
    } catch (err: unknown) {
      console.error(`Error saving ${options.tableName}:`, err)
      setError(err instanceof Error ? err.message : options.errorMessage || `Failed to save ${options.tableName}`)
    } finally {
      setSaving(false)
    }
  }, [id, options.tableName, options.successMessage, options.errorMessage, options.backUrl, supabase, router])

  // Update field in edit data
  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditData(data || {})
    router.push(options.backUrl)
  }, [data, options.backUrl, router])

  // Load data on mount
  useEffect(() => {
    fetchEntity()
  }, [fetchEntity])

  return {
    data,
    editData,
    loading,
    saving,
    error,
    updateField,
    saveEntity,
    cancelEdit,
    refetch: fetchEntity
  }
}

// Hook for creating new entities
export function useEntityCreate<T = Record<string, unknown>>(options: EntityCRUDOptions) {
  const [editData, setEditData] = useState<Partial<T>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Create new entity
  const createEntity = useCallback(async (newData: Partial<T>) => {
    if (!newData) return

    setSaving(true)
    setError(null)

    try {
      const { data: result, error: createError } = await supabase
        .from(options.tableName)
        .insert([newData])
        .select()
        .single()

      if (createError) {
        throw new Error(createError.message)
      }

      // Show success message or navigate back
      if (options.successMessage) {
        console.log(options.successMessage)
      }
      
      // Navigate back to list view
      router.push(options.backUrl)
      
      return result
      
    } catch (err: unknown) {
      console.error(`Error creating ${options.tableName}:`, err)
      setError(err instanceof Error ? err.message : options.errorMessage || `Failed to create ${options.tableName}`)
      return null
    } finally {
      setSaving(false)
    }
  }, [options.tableName, options.successMessage, options.errorMessage, options.backUrl, supabase, router])

  // Update field in edit data
  const updateField = useCallback((field: keyof T, value: T[keyof T]) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // Cancel creation
  const cancelCreate = useCallback(() => {
    setEditData({})
    router.push(options.backUrl)
  }, [options.backUrl, router])

  return {
    editData,
    saving,
    error,
    updateField,
    createEntity,
    cancelCreate
  }
}

// Generic hook for entity lists with CRUD operations
export function useEntityList<T = Record<string, unknown>>(tableName: string, options?: {
  orderBy?: string
  ascending?: boolean
  filters?: Record<string, unknown>
}) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  // Fetch entities list
  const fetchEntities = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase.from(tableName).select('*')

      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            query = query.eq(key, value)
          }
        })
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false })
      }

      const { data: result, error: fetchError } = await query

      if (fetchError) {
        throw new Error(fetchError.message)
      }

      setData(result || [])
    } catch (err: unknown) {
      console.error(`Error fetching ${tableName}:`, err)
      setError(err instanceof Error ? err.message : `Failed to fetch ${tableName}`)
      setData([])
    } finally {
      setLoading(false)
    }
  }, [tableName, options?.orderBy, options?.ascending, options?.filters, supabase])

  // Delete entity
  const deleteEntity = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw new Error(deleteError.message)
      }

      // Refresh the list
      await fetchEntities()
      
      return true
    } catch (err: unknown) {
      console.error(`Error deleting ${tableName}:`, err)
      setError(err instanceof Error ? err.message : `Failed to delete ${tableName}`)
      return false
    }
  }, [tableName, supabase, fetchEntities])

  // Load data on mount
  useEffect(() => {
    fetchEntities()
  }, [fetchEntities])

  return {
    data,
    loading,
    error,
    refetch: fetchEntities,
    deleteEntity
  }
}