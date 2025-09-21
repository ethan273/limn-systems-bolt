'use client'

import React, { useState, useEffect, useCallback } from 'react'

import { 
  Search, 
  Package
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Search result types
export interface SearchResult {
  id: string
  type: 'order' | 'customer' | 'product' | 'project' | 'task' | 'document' | 'user'
  title: string
  description: string
  url: string
  metadata?: Record<string, unknown>
  score: number
  highlight?: string
  category?: string
  tags?: string[]
}

// Search filters
export interface SearchFilter {
  types: string[]
  dateRange?: {
    start?: Date
    end?: Date
  }
  categories?: string[]
  status?: string[]
}

// Search context for different areas of the app
export interface SearchContext {
  module?: string
  filters?: SearchFilter
  scope?: 'global' | 'module' | 'page'
}

interface GlobalSearchProps {
  placeholder?: string
  context?: SearchContext
  onResultSelect?: (result: SearchResult) => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showRecent?: boolean
  showSuggestions?: boolean
  maxResults?: number
}


export function GlobalSearch({
  placeholder = "Search everything...",
  className = '',
  size = 'md',
}: GlobalSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [, setRecentSearches] = useState<string[]>([])
  const [, setIsLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('limn-recent-searches')
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored))
      } catch {
        // Silently handle parsing errors for recent searches
      }
    }
  }, [])

  // Simple item search function
  const searchItems = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const { data: items, error } = await supabase
        .from('items')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .order('name', { ascending: true })
        .limit(10)

      if (!error && items) {
        const searchResults = items.map(item => ({
          id: item.id,
          type: 'product' as const,
          title: item.name || 'Unknown Item',
          description: `${item.category || 'Product'} • $${item.base_price || 0}`,
          url: `/dashboard/items/${item.id}`,
          score: 1,
          category: item.category,
          tags: [item.category].filter(Boolean)
        }))
        setResults(searchResults)
      } else {
        setResults([])
      }
    } catch {
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Perform search when query or filters change
  useEffect(() => {
    if (query.length > 0) {
      searchItems(query)
    } else {
      setResults([])
    }
  }, [query, searchItems])

  // Handle keyboard shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-8 text-sm'
      case 'lg':
        return 'h-12 text-lg'
      default:
        return 'h-10'
    }
  }

  return (
    <>
      <button
        className={cn(
          "relative w-full flex items-center justify-start px-4 py-3 text-left",
          "bg-white border border-stone-200 rounded-lg shadow-sm",
          "hover:border-stone-300 hover:shadow-md transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-glacier-500 focus:border-glacier-500",
          "font-roboto text-sm text-slate-600 placeholder:text-slate-500",
          getSizeClasses(),
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-3 h-4 w-4 text-slate-400" />
        <span className="flex-1 truncate">
          <span className="hidden sm:inline">{placeholder}</span>
          <span className="inline sm:hidden">Search</span>
        </span>
        <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-50 border border-stone-200 rounded text-xs font-mono text-slate-500 font-medium">
          <span>⌘</span>K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div className="fixed left-1/2 top-1/4 w-full max-w-2xl -translate-x-1/2 bg-white rounded-lg shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* Search Input */}
            <div className="flex items-center border-b border-stone-200 px-4 py-3">
              <Search className="mr-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent border-0 outline-none text-slate-900 placeholder:text-slate-500 font-roboto"
                autoFocus
              />
            </div>

            {/* Search Results */}
            <div className="min-h-[200px] max-h-96 overflow-y-auto bg-white">
              {query.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  Start typing to search...
                </div>
              ) : (
                <div className="p-2">
                  {results.map((result) => (
                    <div 
                      key={result.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer rounded-md"
                      onClick={() => {
                        setOpen(false)
                        router.push(result.url)
                      }}
                    >
                      <Package className="h-4 w-4 text-glacier-600" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{result.title}</div>
                        <div className="text-xs text-gray-500">{result.description}</div>
                      </div>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      No results found for &quot;{query}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-stone-200 bg-glacier-50 p-3 rounded-b-lg">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Search results</span>
                <span>ESC to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}