'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu
} from '@/components/ui/dropdown-menu'
import { TableLoading } from '@/components/ui/loading-states'

// Column definition interface
export interface DataTableColumn<T> {
  key: string
  header: string | React.ReactNode
  accessor?: keyof T | ((row: T) => React.ReactNode)
  sortable?: boolean
  filterable?: boolean
  searchable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  cell?: (value: unknown, row: T, index: number) => React.ReactNode
  headerCell?: () => React.ReactNode
}

// Sort configuration
export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

// Filter configuration
export interface FilterConfig {
  [key: string]: unknown
}

// Action configuration
export interface DataTableAction<T> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (row: T, index: number) => void
  variant?: 'default' | 'secondary' | 'destructive'
  show?: (row: T) => boolean
}

// Main props interface
export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  loading?: boolean
  searchable?: boolean
  sortable?: boolean
  filterable?: boolean
  pagination?: boolean
  pageSize?: number
  actions?: DataTableAction<T>[]
  emptyMessage?: string
  className?: string
  searchPlaceholder?: string
  onRowClick?: (row: T, index: number) => void
  selectedRows?: T[]
  onRowSelect?: (rows: T[]) => void
  rowKey?: keyof T | ((row: T) => string | number)
  stickyHeader?: boolean
  compact?: boolean
  striped?: boolean
}

// Utility functions
const getValue = <T,>(row: T, accessor: keyof T | ((row: T) => unknown)): unknown => {
  if (typeof accessor === 'function') {
    return accessor(row)
  }
  return row[accessor]
}

const getSearchableValue = <T,>(row: T, columns: DataTableColumn<T>[]): string => {
  return columns
    .filter(col => col.searchable !== false)
    .map(col => {
      const value = col.accessor ? getValue(row, col.accessor) : row[col.key as keyof T]
      return String(value || '').toLowerCase()
    })
    .join(' ')
}

// Main DataTable component
export function DataTable<T>({
  data,
  columns,
  loading = false,
  searchable = true,
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  actions = [],
  emptyMessage = "No data available",
  className,
  searchPlaceholder = "Search...",
  onRowClick,
  selectedRows = [],
  onRowSelect,
  rowKey = 'id' as keyof T,
  stickyHeader = false,
  compact = false,
  striped = false
}: DataTableProps<T>) {
  
  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)
  const [filters] = useState<FilterConfig>({})
  const [currentPage, setCurrentPage] = useState(1)

  // Get row key
  const getRowKey = useCallback((row: T, index: number) => {
    if (typeof rowKey === 'function') {
      return rowKey(row)
    }
    return row[rowKey] || index
  }, [rowKey])

  // Filtering and searching
  const filteredData = useMemo(() => {
    let result = data

    // Apply search filter
    if (searchTerm && searchable) {
      result = result.filter(row => 
        getSearchableValue(row, columns).includes(searchTerm.toLowerCase())
      )
    }

    // Apply column filters
    if (filterable) {
      result = result.filter(row => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true
          const rowValue = getValue(row, key as keyof T)
          return String(rowValue).toLowerCase().includes(String(value).toLowerCase())
        })
      })
    }

    return result
  }, [data, searchTerm, filters, columns, searchable, filterable])

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig || !sortable) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getValue(a, sortConfig.key as keyof T)
      const bValue = getValue(b, sortConfig.key as keyof T)

      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      let comparison = 0
      if (aValue > bValue) comparison = 1
      if (aValue < bValue) comparison = -1

      return sortConfig.direction === 'desc' ? -comparison : comparison
    })
  }, [filteredData, sortConfig, sortable])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData
    
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  // Sort handler
  const handleSort = (columnKey: string) => {
    if (!sortable) return

    setSortConfig(prevSort => {
      if (prevSort?.key === columnKey) {
        if (prevSort.direction === 'asc') {
          return { key: columnKey, direction: 'desc' }
        } else {
          return null // Remove sort
        }
      }
      return { key: columnKey, direction: 'asc' }
    })
  }

  // Row selection handler
  const handleRowSelect = (row: T) => {
    if (!onRowSelect) return

    const rowKeyValue = getRowKey(row, 0)
    const isSelected = selectedRows.some(selectedRow => 
      getRowKey(selectedRow, 0) === rowKeyValue
    )

    if (isSelected) {
      onRowSelect(selectedRows.filter(selectedRow => 
        getRowKey(selectedRow, 0) !== rowKeyValue
      ))
    } else {
      onRowSelect([...selectedRows, row])
    }
  }

  // Render cell content
  const renderCell = (column: DataTableColumn<T>, row: T, index: number) => {
    const value = column.accessor ? getValue(row, column.accessor) : row[column.key as keyof T]
    
    if (column.cell) {
      return column.cell(value, row, index)
    }

    // Default cell rendering based on value type
    if (value === null || value === undefined) {
      return <span className="text-gray-400">—</span>
    }

    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>
    }

    if (typeof value === 'number') {
      return <span className="font-mono">{value.toLocaleString()}</span>
    }

    if (value instanceof Date) {
      return <span className="font-mono">{value.toLocaleDateString()}</span>
    }

    return <span>{String(value)}</span>
  }

  if (loading) {
    return <TableLoading rows={pageSize} columns={columns.length} />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex items-center justify-between gap-4">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className={cn(
        'border rounded-lg overflow-hidden',
        stickyHeader && 'max-h-96 overflow-y-auto'
      )}>
        <Table className={cn(compact && 'text-sm')}>
          <TableHeader className={cn(stickyHeader && 'sticky top-0 bg-white z-10')}>
            <TableRow className={cn(!striped && 'hover:bg-transparent')}>
              {onRowSelect && (
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === sortedData.length && sortedData.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onRowSelect(sortedData)
                      } else {
                        onRowSelect([])
                      }
                    }}
                    className="rounded"
                  />
                </TableHead>
              )}

              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={cn(
                    'select-none',
                    column.width && `w-${column.width}`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.sortable !== false && sortable && 'cursor-pointer hover:bg-gray-50'
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center gap-2">
                    {column.headerCell ? column.headerCell() : column.header}
                    {column.sortable !== false && sortable && (
                      <div className="flex flex-col">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <SortAsc className="h-3 w-3" />
                          ) : (
                            <SortDesc className="h-3 w-3" />
                          )
                        ) : (
                          <div className="flex flex-col opacity-30">
                            <ChevronUp className="h-2 w-2 -mb-0.5" />
                            <ChevronDown className="h-2 w-2" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}

              {actions.length > 0 && (
                <TableHead className="w-16 text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (onRowSelect ? 1 : 0) + (actions.length > 0 ? 1 : 0)}
                  className="h-32 text-center text-gray-500"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => {
                const rowKeyValue = getRowKey(row, index)
                const isSelected = selectedRows.some(selectedRow => 
                  getRowKey(selectedRow, 0) === rowKeyValue
                )

                return (
                  <TableRow 
                    key={String(rowKeyValue)}
                    className={cn(
                      'cursor-pointer',
                      striped && index % 2 === 0 && 'bg-gray-50/50',
                      isSelected && 'bg-blue-50',
                      onRowClick && 'hover:bg-gray-50'
                    )}
                    onClick={() => onRowClick?.(row, index)}
                  >
                    {onRowSelect && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(row)}
                          className="rounded"
                        />
                      </TableCell>
                    )}

                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          compact && 'py-2'
                        )}
                      >
                        {renderCell(column, row, index)}
                      </TableCell>
                    ))}

                    {actions.length > 0 && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu
                          trigger={
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                          items={actions
                            .filter(action => !action.show || action.show(row))
                            .map(action => ({
                              label: action.label,
                              icon: action.icon,
                              onClick: () => action.onClick(row, index),
                              destructive: action.variant === 'destructive'
                            }))}
                          align="left"
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNumber = currentPage <= 3 
                  ? i + 1 
                  : currentPage >= totalPages - 2
                    ? totalPages - 4 + i
                    : currentPage - 2 + i

                if (pageNumber < 1 || pageNumber > totalPages) return null

                return (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNumber)}
                  >
                    {pageNumber}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Predefined column types for common use cases
export const createDateColumn = <T,>(
  key: string, 
  header: string, 
  accessor?: keyof T
): DataTableColumn<T> => ({
  key,
  header,
  accessor,
  sortable: true,
  cell: (value) => value ? new Date(String(value)).toLocaleDateString() : '—'
})

export const createCurrencyColumn = <T,>(
  key: string, 
  header: string, 
  accessor?: keyof T
): DataTableColumn<T> => ({
  key,
  header,
  accessor,
  sortable: true,
  align: 'right',
  cell: (value) => value ? new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(Number(value || 0)) : '—'
})

export const createStatusColumn = <T,>(
  key: string, 
  header: string, 
  accessor?: keyof T,
  statusMap?: Record<string, { variant: 'default' | 'secondary' | 'destructive', label?: string }>
): DataTableColumn<T> => ({
  key,
  header,
  accessor,
  sortable: true,
  cell: (value) => {
    if (!value) return '—'
    const status = statusMap?.[String(value)] || { variant: 'secondary' as const }
    return (
      <Badge variant={status.variant}>
        {status.label || String(value).replace('_', ' ')}
      </Badge>
    )
  }
})

export const createActionsColumn = <T,>(actions: DataTableAction<T>[]): DataTableAction<T>[] => [
  {
    label: 'View',
    icon: Eye,
    onClick: () => {}, // Override in implementation
  },
  {
    label: 'Edit', 
    icon: Edit,
    onClick: () => {}, // Override in implementation
  },
  {
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    onClick: () => {}, // Override in implementation
  },
  ...actions
]