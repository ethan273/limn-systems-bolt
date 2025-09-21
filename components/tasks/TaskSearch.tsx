'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Search,
  X,
  Filter,
  Calendar,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Task } from '@/types/tasks';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

interface TaskSearchProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  tasks: Task[];
  onSearch: (query: string, filters?: Record<string, unknown>) => void;
  onTaskSelect?: (task: Task) => void;
  onClose?: () => void;
}

export default function TaskSearch({
  searchQuery: externalSearchQuery = '',
  onSearchChange,
  tasks,
  onSearch,
  onTaskSelect,
  onClose
}: TaskSearchProps) {
  const [open, setOpen] = useState(true); // Always open when component renders
  const [searchQuery, setSearchQuery] = useState(externalSearchQuery);
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('task-recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Search function
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const results = tasks.filter(task =>
      task.title.toLowerCase().includes(lowercaseQuery) ||
      task.description?.toLowerCase().includes(lowercaseQuery) ||
      task.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );

    setSearchResults(results.slice(0, 10));
    onSearch(query);

    // Save to recent searches
    const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem('task-recent-searches', JSON.stringify(updatedRecent));
  }, [tasks, onSearch, recentSearches]);

  useEffect(() => {
    performSearch(searchQuery);
    if (onSearchChange) {
      onSearchChange(searchQuery);
    }
  }, [searchQuery, performSearch, onSearchChange]);

  const handleTaskSelect = (task: Task) => {
    if (onTaskSelect) {
      onTaskSelect(task);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };


  return (
    <>
      {/* Search Trigger */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-full justify-start text-sm text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Search className="mr-2 h-4 w-4" />
          Search tasks...
          <kbd className="pointer-events-none absolute right-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* Search Dialog */}
      <CommandDialog open={open} onOpenChange={handleOpenChange}>
        <CommandInput
          placeholder="Search tasks by title, description, or tags..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {searchQuery ? (
            <>
              <CommandEmpty>No tasks found.</CommandEmpty>
              {searchResults.length > 0 && (
                <CommandGroup heading="Search Results">
                  {searchResults.map((task) => (
                    <CommandItem
                      key={task.id}
                      onSelect={() => handleTaskSelect(task)}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          {task.priority && (
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                          )}
                        </div>
                        {task.description && (
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {task.description}
                          </span>
                        )}
                        <div className="flex gap-2 mt-1">
                          {task.tags?.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          ) : (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Recent Searches">
                  {recentSearches.map((search) => (
                    <CommandItem
                      key={search}
                      onSelect={() => setSearchQuery(search)}
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {search}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandSeparator />
              <CommandGroup heading="Quick Filters">
                <CommandItem onSelect={() => onSearch('priority:high')}>
                  <Filter className="mr-2 h-4 w-4" />
                  High Priority Tasks
                </CommandItem>
                <CommandItem onSelect={() => onSearch('status:blocked')}>
                  <X className="mr-2 h-4 w-4" />
                  Blocked Tasks
                </CommandItem>
                <CommandItem onSelect={() => onSearch('due:today')}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Due Today
                </CommandItem>
                <CommandItem onSelect={() => onSearch('assigned:me')}>
                  <User className="mr-2 h-4 w-4" />
                  My Tasks
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}