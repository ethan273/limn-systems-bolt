'use client';

import React from 'react';
// Note: react-window and react-window-infinite-loader not available

// Placeholder interfaces and components since react-window is not available
interface VirtualListProps<T = unknown> {
  items: T[];
  height: number;
  itemHeight?: number;
  renderItem: (props: { item: T; index: number }) => React.ReactElement;
  className?: string;
}

// Simple fallback component
export const VirtualList: React.FC<VirtualListProps> = ({ 
  items, 
  height, 
  renderItem, 
  className = '' 
}) => {
  return (
    <div 
      className={`overflow-auto ${className}`} 
      style={{ height }}
    >
      {items.map((item, index) => 
        renderItem({ 
          item,
          index
        })
      )}
    </div>
  )
}

export const GridVirtualList = VirtualList
export const InfiniteVirtualList = VirtualList

export const useVirtualList = <T = unknown>(items: T[]) => ({
  visibleItems: items,
  visibleRange: { start: 0, end: items.length },
  handleScroll: () => {}
})

export default VirtualList