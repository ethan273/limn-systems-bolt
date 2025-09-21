'use client'

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  showFirstLast?: boolean
  showPrevNext?: boolean
  maxVisiblePages?: number
  className?: string
  disabled?: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className,
  disabled = false
}: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const getVisiblePages = () => {
    const half = Math.floor(maxVisiblePages / 2)
    let start = Math.max(1, currentPage - half)
    const end = Math.min(totalPages, start + maxVisiblePages - 1)
    
    // Adjust start if we're near the end
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1)
    }
    
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  const visiblePages = getVisiblePages()
  const hasFirst = visiblePages[0] > 1
  const hasLast = visiblePages[visiblePages.length - 1] < totalPages

  return (
    <div className={cn("flex items-center justify-center space-x-1", className)}>
      {/* First page */}
      {showFirstLast && hasFirst && (
        <>
          <PaginationButton
            onClick={() => onPageChange(1)}
            disabled={disabled || currentPage === 1}
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </PaginationButton>
        </>
      )}

      {/* Previous page */}
      {showPrevNext && (
        <PaginationButton
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={disabled || currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </PaginationButton>
      )}

      {/* Page numbers */}
      {hasFirst && visiblePages[0] > 2 && (
        <span className="px-2 text-gray-400">...</span>
      )}

      {visiblePages.map((page) => (
        <PaginationButton
          key={page}
          onClick={() => onPageChange(page)}
          disabled={disabled}
          isActive={page === currentPage}
        >
          {page}
        </PaginationButton>
      ))}

      {hasLast && visiblePages[visiblePages.length - 1] < totalPages - 1 && (
        <span className="px-2 text-gray-400">...</span>
      )}

      {/* Next page */}
      {showPrevNext && (
        <PaginationButton
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={disabled || currentPage === totalPages}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </PaginationButton>
      )}

      {/* Last page */}
      {showFirstLast && hasLast && (
        <PaginationButton
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          title="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </PaginationButton>
      )}
    </div>
  )
}

interface PaginationButtonProps {
  onClick: () => void
  disabled?: boolean
  isActive?: boolean
  children: React.ReactNode
  title?: string
}

function PaginationButton({
  onClick,
  disabled = false,
  isActive = false,
  children,
  title
}: PaginationButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center justify-center w-10 h-10 text-sm font-medium rounded-lg transition-colors",
        "hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
        {
          "bg-blue-600 text-white hover:bg-blue-700": isActive,
          "text-gray-700 hover:text-gray-900": !isActive && !disabled,
          "text-gray-400 cursor-not-allowed hover:bg-transparent": disabled
        }
      )}
    >
      {children}
    </button>
  )
}

// Pagination info component
export interface PaginationInfoProps {
  currentPage: number
  pageSize: number
  total: number
  className?: string
}

export function PaginationInfo({
  currentPage,
  pageSize,
  total,
  className
}: PaginationInfoProps) {
  const start = Math.min(total, (currentPage - 1) * pageSize + 1)
  const end = Math.min(total, currentPage * pageSize)

  if (total === 0) {
    return (
      <div className={cn("text-sm text-gray-500", className)}>
        No results found
      </div>
    )
  }

  return (
    <div className={cn("text-sm text-gray-500", className)}>
      Showing {start.toLocaleString()} to {end.toLocaleString()} of{' '}
      {total.toLocaleString()} results
    </div>
  )
}

// Page size selector
export interface PageSizeSelectorProps {
  pageSize: number
  onPageSizeChange: (pageSize: number) => void
  options?: number[]
  className?: string
  disabled?: boolean
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  className,
  disabled = false
}: PageSizeSelectorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <span className="text-sm text-gray-500">Show</span>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        disabled={disabled}
        className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">per page</span>
    </div>
  )
}

// Complete pagination controls
export interface PaginationControlsProps extends PaginationProps {
  pageSize: number
  total: number
  onPageSizeChange?: (pageSize: number) => void
  showInfo?: boolean
  showPageSizeSelector?: boolean
  pageSizeOptions?: number[]
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  showInfo = true,
  showPageSizeSelector = true,
  pageSizeOptions,
  disabled = false,
  ...paginationProps
}: PaginationControlsProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center space-x-4">
        {showInfo && (
          <PaginationInfo
            currentPage={currentPage}
            pageSize={pageSize}
            total={total}
          />
        )}
        {showPageSizeSelector && onPageSizeChange && (
          <PageSizeSelector
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            options={pageSizeOptions}
            disabled={disabled}
          />
        )}
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={disabled}
        {...paginationProps}
      />
    </div>
  )
}