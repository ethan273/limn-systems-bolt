'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'

export interface VirtualListProps<T> {
  items: T[]
  height: number
  itemHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  overscan?: number
  className?: string
  onScroll?: (scrollTop: number) => void
  loading?: boolean
  loadingComponent?: React.ReactNode
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
  loading = false,
  loadingComponent
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  const { visibleItems, totalHeight, offsetY } = useMemo(() => {
    const containerHeight = height
    const totalHeight = items.length * itemHeight

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index
    }))

    const offsetY = startIndex * itemHeight

    return {
      visibleItems,
      totalHeight,
      offsetY
    }
  }, [items, itemHeight, scrollTop, height, overscan])


  if (loading && loadingComponent) {
    return (
      <div className={`overflow-hidden ${className}`} style={{ height }}>
        {loadingComponent}
      </div>
    )
  }

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Virtual table component
export interface VirtualTableColumn<T> {
  key: keyof T | string
  header: string
  width?: number | string
  render?: (value: unknown, item: T, index: number) => React.ReactNode
  className?: string
}

export interface VirtualTableProps<T> {
  data: T[]
  columns: VirtualTableColumn<T>[]
  height: number
  rowHeight?: number
  overscan?: number
  className?: string
  loading?: boolean
  onRowClick?: (item: T, index: number) => void
}

export function VirtualTable<T>({
  data,
  columns,
  height,
  rowHeight = 56,
  overscan = 5,
  className = '',
  loading = false,
  onRowClick
}: VirtualTableProps<T>) {
  const renderRow = useCallback((item: T, index: number) => {
    return (
      <div
        className={`flex border-b border-gray-200 hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
        onClick={() => onRowClick?.(item, index)}
      >
        {columns.map((column, colIndex) => {
          const value = typeof column.key === 'string' && (column.key || "").includes('.') 
            ? (column.key || "").split('.').reduce((obj: unknown, key: string) => 
                obj && typeof obj === 'object' && key in obj 
                  ? (obj as Record<string, unknown>)[key] 
                  : undefined, item as unknown)
            : (item as Record<string, unknown>)[column.key as string]

          return (
            <div
              key={colIndex}
              className={`flex items-center px-4 py-2 ${column.className || ''}`}
              style={{ 
                width: column.width || `${100 / columns.length}%`,
                minWidth: column.width || 'auto'
              }}
            >
              {column.render ? column.render(value, item, index) : String(value || '')}
            </div>
          )
        })}
      </div>
    )
  }, [columns, onRowClick])

  if (loading) {
    return (
      <div className={`border border-gray-200 rounded-lg ${className}`} style={{ height }}>
        <div className="flex bg-gray-50 border-b border-gray-200">
          {columns.map((column, index) => (
            <div
              key={index}
              className="px-4 py-3 font-medium text-gray-900"
              style={{ 
                width: column.width || `${100 / columns.length}%`,
                minWidth: column.width || 'auto'
              }}
            >
              {column.header}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center" style={{ height: height - 57 }}>
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${className}`} style={{ height }}>
      {/* Header */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        {columns.map((column, index) => (
          <div
            key={index}
            className="px-4 py-3 font-medium text-gray-900"
            style={{ 
              width: column.width || `${100 / columns.length}%`,
              minWidth: column.width || 'auto'
            }}
          >
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Virtual scrolling body */}
      <VirtualList
        items={data}
        height={height - 57} // Subtract header height
        itemHeight={rowHeight}
        renderItem={renderRow}
        overscan={overscan}
      />
    </div>
  )
}

// Hook for managing virtual list state
export function useVirtualList<T>(
  items: T[],
  { itemHeight = 50, containerHeight = 400, overscan = 5 } = {}
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    )
    
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index
      }))
  }, [items, visibleRange])

  const totalHeight = items.length * itemHeight
  const offsetY = visibleRange.startIndex * itemHeight

  return {
    visibleItems,
    totalHeight,
    offsetY,
    scrollTop,
    setScrollTop,
    visibleRange
  }
}