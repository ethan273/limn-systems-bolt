import { ReactNode } from 'react'
import { Search } from 'lucide-react'

interface FilterBarProps {
  searchPlaceholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  filters?: ReactNode
  tabs?: ReactNode
  actions?: ReactNode
  className?: string
}

export function FilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters,
  tabs,
  actions,
  className = ''
}: FilterBarProps) {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6 ${className}`}>
      {/* Tabs row (if provided) */}
      {tabs && (
        <div className="mb-6 border-b border-slate-200 pb-4">
          {tabs}
        </div>
      )}
      
      {/* Search and filters row */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left side - Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="search-input" className="sr-only">{searchPlaceholder}</label>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
            <input
              id="search-input"
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 font-medium placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          
          {/* Filters */}
          {filters && (
            <div className="flex gap-3">
              {filters}
            </div>
          )}
        </div>
        
        {/* Right side - Actions */}
        {actions && (
          <div className="flex gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}