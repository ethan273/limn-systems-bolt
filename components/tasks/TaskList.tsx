'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Plus,
  MoreHorizontal,
  Flag,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  Eye,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Task, TaskFilter } from '@/types/tasks';
import { ExportButton } from '@/components/ui/export-button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, isBefore } from 'date-fns';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface TaskListProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  onBulkAction?: (action: string, taskIds: string[]) => void;
  showBulkActions?: boolean;
  canEdit?: boolean;
}

type SortField = keyof Task;
type SortDirection = 'asc' | 'desc';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700'
};

const STATUS_COLORS = {
  todo: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700'
};

const STATUS_ICONS = {
  todo: Square,
  in_progress: PlayCircle,
  blocked: AlertTriangle,
  review: PauseCircle,
  done: CheckCircle2
};

export default function TaskList({
  tasks,
  onTaskClick,
  onTaskUpdate,
  onTaskDelete,
  onBulkAction,
  showBulkActions = false,
  canEdit = false
}: TaskListProps) {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filters, setFilters] = useState<Partial<TaskFilter>>({
    status: '',
    priority: '',
    assignee: '',
    project: '',
    dateRange: '',
    department: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate task urgency
  const getTaskUrgency = (task: Task): 'overdue' | 'due_soon' | 'on_track' => {
    if (!task.due_date) return 'on_track';
    
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    if (isBefore(dueDate, now)) return 'overdue';
    if (isBefore(dueDate, oneDayFromNow)) return 'due_soon';
    return 'on_track';
  };

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!(task.title || "").toLowerCase().includes(query) &&
            !task.description?.toLowerCase().includes(query) &&
            !task.project_name?.toLowerCase().includes(query) &&
            !task.customer_name?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Status filter
      if (filters.status && filters.status !== task.status) return false;
      
      // Priority filter
      if (filters.priority && filters.priority !== task.priority) return false;
      
      // Department filter
      if (filters.department && filters.department !== task.department) return false;

      return true;
    });

    // Sort tasks
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'due_date' || sortField === 'created_at' || sortField === 'updated_at') {
        aVal = aVal ? new Date(aVal as string).getTime() : 0;
        bVal = bVal ? new Date(bVal as string).getTime() : 0;
      } else if (typeof aVal === 'string') {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [tasks, searchQuery, filters, sortField, sortDirection]);

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle row selection
  const handleSelectTask = (taskId: string, selected: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (selected) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(new Set(filteredAndSortedTasks.map(t => t.id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  // Render priority badge
  const renderPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    return (
      <Badge variant="secondary" className={PRIORITY_COLORS[priority as keyof typeof PRIORITY_COLORS]}>
        <Flag className="w-3 h-3 mr-1" />
        {priority}
      </Badge>
    );
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
    return (
      <Badge variant="secondary" className={STATUS_COLORS[status as keyof typeof STATUS_COLORS]}>
        <StatusIcon className="w-3 h-3 mr-1" />
        {safeFormatString(status, 'unknown')}
      </Badge>
    );
  };

  // Render due date
  const renderDueDate = (task: Task) => {
    if (!task.due_date) return <span className="text-gray-400">-</span>;
    
    const dueDate = new Date(task.due_date);
    const urgency = getTaskUrgency(task);
    
    const dateClasses = cn(
      "text-xs",
      urgency === 'overdue' && "text-red-600 font-semibold",
      urgency === 'due_soon' && "text-orange-600 font-medium",
      urgency === 'on_track' && "text-gray-600"
    );

    return (
      <div className={dateClasses}>
        <div>{format(dueDate, 'MMM d, yyyy')}</div>
        <div className="text-xs opacity-75">
          {formatDistanceToNow(dueDate, { addSuffix: true })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 bg-white rounded-lg shadow p-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Task List</h2>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-gray-100")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>

          {showBulkActions && selectedTasks.size > 0 && (
            <DropdownMenu
              trigger={
                <Button variant="outline">
                  Actions ({selectedTasks.size})
                </Button>
              }
              items={[
                {
                  label: "Mark as Done",
                  icon: CheckCircle2,
                  onClick: () => onBulkAction?.('mark_done', Array.from(selectedTasks))
                },
                {
                  label: "Delete",
                  icon: Trash2,
                  onClick: () => onBulkAction?.('delete', Array.from(selectedTasks)),
                  destructive: true
                }
              ]}
            />
          )}

          <ExportButton
            data={filteredAndSortedTasks as unknown as Record<string, unknown>[]}
            type="tasks"
            title="Tasks Export"
            defaultColumns={['title', 'status', 'priority', 'assigned_to', 'due_date', 'created_at']}
          />

          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <Select value={filters.status || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.priority || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filters.department || ''} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Results Summary */}
      <div className="text-sm text-gray-600">
        Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
        {selectedTasks.size > 0 && ` • ${selectedTasks.size} selected`}
      </div>

      {/* Tasks Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {showBulkActions && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedTasks.size === filteredAndSortedTasks.length && filteredAndSortedTasks.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-8 p-0 font-semibold text-left justify-start"
                  onClick={() => handleSort('title')}
                >
                  Task
                  {renderSortIcon('title')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-8 p-0 font-semibold"
                  onClick={() => handleSort('status')}
                >
                  Status
                  {renderSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-8 p-0 font-semibold"
                  onClick={() => handleSort('priority')}
                >
                  Priority
                  {renderSortIcon('priority')}
                </Button>
              </TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-8 p-0 font-semibold"
                  onClick={() => handleSort('due_date')}
                >
                  Due Date
                  {renderSortIcon('due_date')}
                </Button>
              </TableHead>
              <TableHead>Project</TableHead>
              <TableHead>
                <Button 
                  variant="ghost" 
                  className="h-8 p-0 font-semibold"
                  onClick={() => handleSort('updated_at')}
                >
                  Updated
                  {renderSortIcon('updated_at')}
                </Button>
              </TableHead>
              <TableHead className="w-16">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.map(task => (
              <TableRow 
                key={task.id} 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onTaskClick(task)}
              >
                {showBulkActions && (
                  <TableCell>
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={(checked) => handleSelectTask(task.id, !!checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {task.description}
                      </div>
                    )}
                    {task.parent_task_title && (
                      <div className="text-xs text-gray-500">
                        Subtask of: {task.parent_task_title}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {renderStatusBadge(task.status)}
                </TableCell>
                <TableCell>
                  {renderPriorityBadge(task.priority)}
                </TableCell>
                <TableCell>
                  {renderDueDate(task)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {task.project_name && (
                      <div className="font-medium">{task.project_name}</div>
                    )}
                    {task.customer_name && (
                      <div className="text-gray-600">{task.customer_name}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu
                    trigger={
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    }
                    items={[
                      {
                        label: "View",
                        icon: Eye,
                        onClick: () => onTaskClick(task)
                      },
                      ...(canEdit ? [
                        {
                          label: "Edit",
                          icon: Edit,
                          onClick: () => onTaskUpdate?.(task)
                        },
                        {
                          label: "Delete",
                          icon: Trash2,
                          onClick: () => onTaskDelete?.(task.id),
                          destructive: true
                        }
                      ] : [])
                    ]}
                    align="left"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredAndSortedTasks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p>Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}