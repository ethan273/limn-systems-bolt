'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { X, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { TaskFilter } from '@/types/tasks';

interface TaskFiltersProps {
  filters: TaskFilter;
  onFiltersChange: (filters: TaskFilter) => void;
  onClearFilters?: () => void;
  userOptions?: Array<{ value: string; label: string }>;
  projectOptions?: Array<{ value: string; label: string }>;
}

export default function TaskFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  userOptions = []
}: TaskFiltersProps) {
  const [dateRange, setDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});

  const handleFilterChange = (key: keyof TaskFilter, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      assignee: 'all',
      project: 'all',
      dateRange: 'all',
      department: 'all',
      visibility: 'all'
    });
    setDateRange({});
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  return (
    <div className="flex flex-wrap gap-3 p-4 bg-white rounded-lg border">
      {/* Status Filter */}
      <Select 
        value={filters.status} 
        onValueChange={(value) => handleFilterChange('status', value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="todo">To Do</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="blocked">Blocked</SelectItem>
          <SelectItem value="review">Review</SelectItem>
          <SelectItem value="done">Done</SelectItem>
        </SelectContent>
      </Select>

      {/* Priority Filter */}
      <Select 
        value={filters.priority} 
        onValueChange={(value) => handleFilterChange('priority', value)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
        </SelectContent>
      </Select>

      {/* Assignee Filter */}
      <Select 
        value={filters.assignee} 
        onValueChange={(value) => handleFilterChange('assignee', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Assignee" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Assignees</SelectItem>
          {userOptions.map(user => (
            <SelectItem key={user.value} value={user.value}>
              {user.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department Filter */}
      <Select 
        value={filters.department} 
        onValueChange={(value) => handleFilterChange('department', value)}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          <SelectItem value="design">Design</SelectItem>
          <SelectItem value="production">Production</SelectItem>
          <SelectItem value="sales">Sales</SelectItem>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="finance">Finance</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{
              from: dateRange.from,
              to: dateRange.to
            }}
            onSelect={(date: Date | { from?: Date; to?: Date } | undefined) => {
              if (date && typeof date === 'object' && 'from' in date) {
                const range = date as { from?: Date; to?: Date };
                setDateRange(range || {});
                if (range?.from) {
                  handleFilterChange('dateRange', `${range.from.toISOString()}_${range.to?.toISOString() || ''}`);
                }
              }
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters || clearFilters}
          className="ml-auto"
        >
          <X className="w-4 h-4 mr-1" />
          Clear filters
          <Badge variant="secondary" className="ml-2">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}