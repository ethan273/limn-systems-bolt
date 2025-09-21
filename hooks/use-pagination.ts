'use client'

import { useState, useCallback, useMemo } from 'react'

export interface PaginationParams {
  page: number
  pageSize: number
  offset: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
    offset: number
  }
}

export interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
  maxPageSize?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialPageSize = 20,
    maxPageSize = 100
  } = options

  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(Math.min(initialPageSize, maxPageSize))

  const paginationParams: PaginationParams = useMemo(() => ({
    page,
    pageSize,
    offset: (page - 1) * pageSize
  }), [page, pageSize])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1)
  }, [])

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1))
  }, [])

  const changePageSize = useCallback((newPageSize: number) => {
    const validPageSize = Math.min(Math.max(1, newPageSize), maxPageSize)
    setPageSize(validPageSize)
    // Reset to first page when changing page size
    setPage(1)
  }, [maxPageSize])

  const reset = useCallback(() => {
    setPage(initialPage)
    setPageSize(initialPageSize)
  }, [initialPage, initialPageSize])

  const createPaginationResult = useCallback(<T>(
    data: T[], 
    total: number
  ): PaginationResult<T> => {
    const totalPages = Math.ceil(total / pageSize)
    
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        offset: paginationParams.offset
      }
    }
  }, [page, pageSize, paginationParams.offset])

  return {
    page,
    pageSize,
    paginationParams,
    goToPage,
    nextPage,
    prevPage,
    changePageSize,
    reset,
    createPaginationResult
  }
}

// Client-side pagination for arrays
export function usePaginatedData<T>(
  data: T[],
  options: UsePaginationOptions = {}
) {
  const pagination = usePagination(options)
  const { page, pageSize } = pagination

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return data.slice(startIndex, endIndex)
  }, [data, page, pageSize])

  const result = pagination.createPaginationResult(paginatedData, data.length)

  return {
    ...pagination,
    result
  }
}

// Search and filter with pagination
export function useSearchPagination<T>(
  data: T[],
  searchFn: (item: T, query: string) => boolean,
  options: UsePaginationOptions = {}
) {
  const [searchQuery, setSearchQuery] = useState('')
  const pagination = usePagination(options)

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data
    }
    return data.filter(item => searchFn(item, searchQuery.toLowerCase()))
  }, [data, searchQuery, searchFn])

  const paginatedData = usePaginatedData(filteredData, {
    ...options,
    initialPage: pagination.page,
    initialPageSize: pagination.pageSize
  })

  // Reset to first page when search query changes
  const setSearch = useCallback((query: string) => {
    setSearchQuery(query)
    pagination.goToPage(1)
  }, [pagination])

  return {
    ...paginatedData,
    searchQuery,
    setSearch,
    filteredData
  }
}

// Hook for API pagination
export function useApiPagination<T>(
  fetchFn: (params: PaginationParams & { search?: string }) => Promise<PaginationResult<T>>,
  options: UsePaginationOptions = {}
) {
  const pagination = usePagination(options)
  const [searchQuery, setSearchQuery] = useState('')
  const [data, setData] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await fetchFn({
        ...pagination.paginationParams,
        search: searchQuery
      })
      
      setData(result.data)
      setTotal(result.pagination.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
      console.error('API pagination error:', err)
    } finally {
      setLoading(false)
    }
  }, [fetchFn, pagination.paginationParams, searchQuery])

  const setSearch = useCallback((query: string) => {
    setSearchQuery(query)
    pagination.goToPage(1)
  }, [pagination])

  const result = pagination.createPaginationResult(data, total)

  return {
    ...pagination,
    result,
    searchQuery,
    setSearch,
    loading,
    error,
    refetch: fetchData
  }
}