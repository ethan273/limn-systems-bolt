"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiRequest, formatErrorMessage } from '@/lib/error-handling'

interface ApiDataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  lastFetch: Date | null
}

interface UseApiDataOptions {
  cacheTime?: number // Cache time in milliseconds, default 5 minutes
  staleTime?: number // Stale time in milliseconds, default 30 seconds
  refetchOnMount?: boolean
  refetchOnWindowFocus?: boolean
  enabled?: boolean
}

// Simple in-memory cache
const apiCache = new Map<string, { data: unknown; timestamp: number; staleTimestamp: number }>()

export function useApiData<T>(
  url: string, 
  options: UseApiDataOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 30 * 1000, // 30 seconds
    refetchOnMount = true,
    refetchOnWindowFocus = true,
    enabled = true
  } = options

  const [state, setState] = useState<ApiDataState<T>>({
    data: null,
    loading: true,
    error: null,
    lastFetch: null
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return

    // Check cache first
    const cacheKey = url
    const cached = apiCache.get(cacheKey)
    const now = Date.now()

    if (!forceRefresh && cached && (now - cached.timestamp < cacheTime)) {
      // Use cached data if it's fresh
      if (now - cached.staleTimestamp < staleTime) {
        setState(prev => ({
          ...prev,
          data: cached.data as T | null,
          loading: false,
          error: null,
          lastFetch: new Date(cached.timestamp)
        }))
        return cached.data
      } else {
        // Data is stale but within cache time - return stale data but refetch in background
        setState(prev => ({
          ...prev,
          data: cached.data as T | null,
          loading: false,
          error: null,
          lastFetch: new Date(cached.timestamp)
        }))
      }
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    try {
      setState(prev => ({
        ...prev,
        loading: !cached, // Don't show loading if we have cached data
        error: null
      }))

      const data = await apiRequest<T>(url, {
        signal: abortControllerRef.current.signal
      }, {
        context: `Fetching data from ${url}`,
        retryable: true,
        logError: true
      })

      if (!mountedRef.current) return

      // Update cache
      apiCache.set(cacheKey, {
        data,
        timestamp: now,
        staleTimestamp: now
      })

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: new Date()
      })

      return data

    } catch (error) {
      if ((error as Error).name === 'AbortError') return

      if (!mountedRef.current) return

      // If we have cached data, keep it and just log the error
      if (cached) {
        console.warn(`API refresh failed for ${url}, using cached data:`, formatErrorMessage(error))
        return cached.data
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: formatErrorMessage(error, `fetch data from ${url}`)
      }))
    }
  }, [url, enabled, cacheTime, staleTime])

  // Initial fetch
  useEffect(() => {
    if (refetchOnMount && enabled) {
      fetchData()
    }

    return () => {
      mountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData, refetchOnMount, enabled])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchData, refetchOnWindowFocus])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  const mutate = useCallback((newData: T | ((prevData: T | null) => T)) => {
    setState(prev => ({
      ...prev,
      data: typeof newData === 'function' 
        ? (newData as (prevData: T | null) => T)(prev.data)
        : newData,
      lastFetch: new Date()
    }))

    // Update cache
    const finalData = typeof newData === 'function' 
      ? (newData as (prevData: T | null) => T)(state.data)
      : newData

    apiCache.set(url, {
      data: finalData,
      timestamp: Date.now(),
      staleTimestamp: Date.now()
    })
  }, [url, state.data])

  return {
    ...state,
    refetch,
    mutate,
    isStale: false // Could implement staleness detection
  }
}

// Hook for multiple API endpoints
export function useApiDataMultiple<T extends Record<string, unknown>>(
  endpoints: Record<keyof T, string>,
  options: UseApiDataOptions = {}
) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: string | null
    lastFetch: Date | null
  }>({
    data: null,
    loading: true,
    error: null,
    lastFetch: null
  })

  const fetchAllData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const promises = Object.entries(endpoints).map(async ([key, url]) => {
        try {
          const data = await apiRequest(url as string, {
            credentials: 'include'
          }, {
            context: `Fetching ${key}`,
            retryable: true,
            logError: false, // We'll handle logging at this level
            fallbackData: null
          })
          return [key, data]
        } catch (error) {
          console.warn(`Failed to fetch ${key} from ${url}:`, formatErrorMessage(error))
          return [key, null]
        }
      })

      const results = await Promise.all(promises)
      const data = Object.fromEntries(results) as T

      setState({
        data,
        loading: false,
        error: null,
        lastFetch: new Date()
      })

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: formatErrorMessage(error, 'fetch multiple endpoints')
      }))
    }
  }, [endpoints])

  useEffect(() => {
    if (options.enabled !== false) {
      fetchAllData()
    }
  }, [fetchAllData, options.enabled])

  return {
    ...state,
    refetch: fetchAllData
  }
}