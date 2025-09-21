'use client'

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DocumentFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General', color: 'text-gray-600' },
  { value: 'design', label: 'Design Files', color: 'text-purple-600' },
  { value: 'specifications', label: 'Specifications', color: 'text-blue-600' },
  { value: 'approvals', label: 'Approvals', color: 'text-green-600' },
  { value: 'photos', label: 'Photos', color: 'text-yellow-600' }
]

export function DocumentFilters({ selectedCategory, onCategoryChange, searchQuery, onSearchChange }: DocumentFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#91bdbd] focus:border-transparent"
        />
      </div>

      {/* Category Filters */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Categories</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.value}
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.value)}
              className={cn(
                "text-xs",
                selectedCategory === category.value
                  ? "bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50",
                category.color
              )}
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}