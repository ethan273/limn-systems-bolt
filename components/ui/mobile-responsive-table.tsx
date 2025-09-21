'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TableColumn {
  key: string
  label: string
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
  className?: string
  mobileHidden?: boolean
}

interface MobileResponsiveTableProps {
  columns: TableColumn[]
  data: Record<string, unknown>[]
  onRowClick?: (row: Record<string, unknown>) => void
  className?: string
  mobileCardLayout?: boolean
  emptyState?: React.ReactNode
}

export function MobileResponsiveTable({
  columns,
  data,
  onRowClick,
  className,
  mobileCardLayout = true,
  emptyState
}: MobileResponsiveTableProps) {
  const primaryColumns = columns.filter(col => !col.mobileHidden)
  // secondaryColumns removed - not used

  if (data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-left text-sm font-medium text-gray-700',
                      column.className
                    )}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-3 text-sm text-gray-900',
                        column.className
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] || '')
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map((row, index) => (
          <Card
            key={index}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'transition-all hover:shadow-md',
              onRowClick && 'cursor-pointer active:scale-[0.98]'
            )}
          >
            <CardContent className="p-4">
              {mobileCardLayout ? (
                // Card layout for mobile
                <div className="space-y-3">
                  {/* Primary info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {primaryColumns.slice(0, 2).map((column) => (
                        <div key={column.key} className="mb-1">
                          {column.render ? (
                            <div className="text-sm">
                              {column.render(row[column.key], row)}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {String(row[column.key] || '')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Status or action column on the right */}
                    {primaryColumns.length > 2 && (
                      <div className="ml-4 flex-shrink-0">
                        {primaryColumns.slice(2, 3).map((column) => (
                          <div key={column.key}>
                            {column.render
                              ? column.render(row[column.key], row)
                              : <Badge variant="outline">
                                  {String(row[column.key] || '')}
                                </Badge>
                            }
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Secondary info */}
                  {primaryColumns.length > 3 && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      {primaryColumns.slice(3).map((column) => (
                        <div key={column.key} className="text-xs text-gray-600">
                          <span className="font-medium">{column.label}:</span>{' '}
                          {column.render
                            ? column.render(row[column.key], row)
                            : String(row[column.key] || '')
                          }
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Simple list layout for mobile
                <div className="space-y-2">
                  {primaryColumns.map((column) => (
                    <div key={column.key} className="flex justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {column.label}:
                      </span>
                      <span className="text-sm text-gray-900 text-right">
                        {column.render
                          ? column.render(row[column.key], row)
                          : String(row[column.key] || '')
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Hook for responsive table management
export function useResponsiveTable() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return { isMobile }
}

export default MobileResponsiveTable