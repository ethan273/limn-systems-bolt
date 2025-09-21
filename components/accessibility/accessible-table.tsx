'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { a11y } from '@/lib/accessibility/aria-helpers'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccessibleInput } from './accessible-form'

// Column Definition
export interface TableColumn<T = unknown> {
  key: string
  header: string
  accessor?: keyof T | ((row: T) => React.ReactNode)
  sortable?: boolean
  searchable?: boolean
  className?: string
  headerClassName?: string
  cellClassName?: string
  width?: string | number
  minWidth?: string | number
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: T, index: number) => React.ReactNode
}

// Sort Configuration
type SortDirection = 'asc' | 'desc' | null
interface SortConfig {
  key: string
  direction: SortDirection
}

// Filter Configuration  
interface FilterConfig {
  [key: string]: string
}

// Table Props
interface AccessibleTableProps<T = unknown> {
  data: T[]
  columns: TableColumn<T>[]
  caption?: string
  sortable?: boolean
  searchable?: boolean
  filterable?: boolean
  pagination?: boolean
  pageSize?: number
  emptyMessage?: string
  loading?: boolean
  loadingMessage?: string
  className?: string
  onRowClick?: (row: T, index: number) => void
  onSort?: (column: string, direction: SortDirection) => void
  onSearch?: (query: string) => void
  onFilter?: (filters: FilterConfig) => void
  rowKey?: keyof T | ((row: T) => string | number)
  selectable?: boolean
  selectedRows?: Set<string | number>
  onSelectionChange?: (selectedRows: Set<string | number>) => void
  ariaLabel?: string
}

export function AccessibleTable<T = unknown>({
  data,
  columns,
  caption,
  sortable = true,
  searchable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  emptyMessage = "No data available",
  loading = false,
  loadingMessage = "Loading data...",
  className,
  onRowClick,
  onSort,
  onSearch,
  onFilter,
  rowKey,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  ariaLabel
}: AccessibleTableProps<T>) {
  const [internalSort, setInternalSort] = useState<SortConfig>({ key: '', direction: null })
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<FilterConfig>({})
  const [currentPage, setCurrentPage] = useState(1)
  
  // Use external sort if provided, otherwise internal
  const sortConfig = onSort ? internalSort : internalSort
  
  // Generate row keys
  const getRowKey = (row: T, index: number): string | number => {
    if (rowKey) {
      if (typeof rowKey === 'function') {
        return rowKey(row)
      } else {
        return row[rowKey] as string | number
      }
    }
    return index
  }

  // Handle sorting
  const handleSort = (columnKey: string) => {
    if (!sortable) return
    
    const column = columns.find(col => col.key === columnKey)
    if (!column?.sortable) return

    let newDirection: SortDirection = 'asc'
    
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === 'asc') {
        newDirection = 'desc'
      } else if (sortConfig.direction === 'desc') {
        newDirection = null
      }
    }

    const newSort = { key: columnKey, direction: newDirection }
    setInternalSort(newSort)
    
    if (onSort) {
      onSort(columnKey, newDirection)
    }
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setCurrentPage(1)
    
    if (onSearch) {
      onSearch(query)
    }
  }

  // Handle filtering
  const handleFilter = (columnKey: string, value: string) => {
    const newFilters = { ...filters, [columnKey]: value }
    if (!value) {
      delete newFilters[columnKey]
    }
    
    setFilters(newFilters)
    setCurrentPage(1)
    
    if (onFilter) {
      onFilter(newFilters)
    }
  }

  // Process data (sort, search, filter)
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply search
    if (searchQuery && !onSearch) {
      const searchableColumns = columns.filter(col => col.searchable !== false)
      result = result.filter(row => 
        searchableColumns.some(col => {
          const value = typeof col.accessor === 'function' 
            ? col.accessor(row)
            : col.accessor 
            ? row[col.accessor]
            : row[col.key as keyof T]
          
          return String(value).toLowerCase().includes(searchQuery.toLowerCase())
        })
      )
    }

    // Apply filters
    if (Object.keys(filters).length > 0 && !onFilter) {
      result = result.filter(row => 
        Object.entries(filters).every(([key, value]) => {
          const column = columns.find(col => col.key === key)
          if (!column) return true
          
          const cellValue = typeof column.accessor === 'function'
            ? column.accessor(row)
            : column.accessor
            ? row[column.accessor]
            : row[key as keyof T]
          
          return String(cellValue).toLowerCase().includes(value.toLowerCase())
        })
      )
    }

    // Apply sorting
    if (sortConfig.key && sortConfig.direction && !onSort) {
      const column = columns.find(col => col.key === sortConfig.key)
      if (column) {
        result.sort((a, b) => {
          let aValue = typeof column.accessor === 'function'
            ? column.accessor(a)
            : column.accessor
            ? a[column.accessor]
            : a[sortConfig.key as keyof T]
          
          let bValue = typeof column.accessor === 'function'
            ? column.accessor(b)
            : column.accessor
            ? b[column.accessor]
            : b[sortConfig.key as keyof T]

          // Handle null/undefined values
          if (aValue == null && bValue == null) return 0
          if (aValue == null) return 1
          if (bValue == null) return -1

          // Handle different data types
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue.toLowerCase()
          }

          if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1
          }
          return 0
        })
      }
    }

    return result
  }, [data, columns, searchQuery, filters, sortConfig, onSearch, onFilter, onSort])

  // Pagination
  const totalPages = pagination ? Math.ceil(processedData.length / pageSize) : 1
  const paginatedData = pagination 
    ? processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : processedData

  // Selection handling
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return
    
    if (checked) {
      const allKeys = new Set(paginatedData.map((row, index) => getRowKey(row, index)))
      onSelectionChange(new Set([...selectedRows, ...allKeys]))
    } else {
      const pageKeys = new Set(paginatedData.map((row, index) => getRowKey(row, index)))
      const newSelection = new Set([...selectedRows].filter(key => !pageKeys.has(key)))
      onSelectionChange(newSelection)
    }
  }

  const handleSelectRow = (rowKey: string | number, checked: boolean) => {
    if (!onSelectionChange) return
    
    const newSelection = new Set(selectedRows)
    if (checked) {
      newSelection.add(rowKey)
    } else {
      newSelection.delete(rowKey)
    }
    onSelectionChange(newSelection)
  }

  // Check if all visible rows are selected
  const allVisibleSelected = paginatedData.length > 0 && 
    paginatedData.every((row, index) => selectedRows.has(getRowKey(row, index)))

  const someVisibleSelected = paginatedData.some((row, index) => 
    selectedRows.has(getRowKey(row, index))
  )

  return (
    <div className={cn("space-y-4", className)}>
      {/* Search and Filter Controls */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          {searchable && (
            <div className="flex-1">
              <AccessibleInput
                label="Search table"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="max-w-md"
              />
            </div>
          )}

          {/* Filters */}
          {filterable && (
            <div className="flex flex-wrap gap-2">
              {columns
                .filter(col => col.searchable !== false)
                .map(column => (
                  <div key={`filter-${column.key}`} className="min-w-[150px]">
                    <AccessibleInput
                      label={`Filter ${column.header}`}
                      value={filters[column.key] || ''}
                      onChange={(e) => handleFilter(column.key, e.target.value)}
                      placeholder={`Filter ${(column.header || "").toLowerCase()}...`}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table 
          className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
          {...a11y.attributes.table(caption)}
          aria-label={ariaLabel || caption || "Data table"}
        >
          {caption && (
            <caption className="sr-only">
              {caption}
            </caption>
          )}
          
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {/* Selection Column */}
              {selectable && (
                <th 
                  scope="col"
                  className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                >
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider",
                    column.sortable && sortable && "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700",
                    column.headerClassName
                  )}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    textAlign: column.align
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                  {...(column.sortable && sortable && {
                    role: 'columnheader',
                    'aria-sort': sortConfig.key === column.key ? 
                      (sortConfig.direction === 'asc' ? 'ascending' : 
                       sortConfig.direction === 'desc' ? 'descending' : 'none') : 
                      'none',
                    tabIndex: 0,
                    'aria-label': a11y.labels.sortable(column.header)
                  })}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && sortable && (
                      <span className="flex-shrink-0">
                        {sortConfig.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-4 w-4" aria-hidden="true" />
                          ) : sortConfig.direction === 'desc' ? (
                            <ChevronDown className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 opacity-50" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    {loadingMessage}
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td 
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const key = getRowKey(row, index)
                const isSelected = selectedRows.has(key)
                
                return (
                  <tr
                    key={key}
                    className={cn(
                      "hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-blue-50 dark:bg-blue-900/20"
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {/* Selection Column */}
                    {selectable && (
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(key, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`Select row ${index + 1}`}
                        />
                      </td>
                    )}

                    {columns.map((column) => {
                      let cellValue = typeof column.accessor === 'function'
                        ? column.accessor(row)
                        : column.accessor
                        ? row[column.accessor]
                        : row[column.key as keyof T]

                      if (column.render) {
                        cellValue = column.render(cellValue, row, index)
                      }

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            "px-4 py-3 text-sm text-gray-900 dark:text-gray-100",
                            column.cellClassName
                          )}
                          style={{ textAlign: column.align }}
                        >
                          {cellValue as React.ReactNode}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedData.length)} of {processedData.length} results
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
            >
              Previous
            </Button>
            
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Screen Reader Summary */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {loading 
          ? loadingMessage
          : `Table with ${processedData.length} rows${selectedRows.size > 0 ? `, ${selectedRows.size} selected` : ''}${sortConfig.direction ? `, sorted by ${columns.find(c => c.key === sortConfig.key)?.header} ${sortConfig.direction}ending` : ''}`
        }
      </div>
    </div>
  )
}