'use client';

import { useEffect, useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Filter,
  Search,
  MoreHorizontal,
  Clock,
  AlertCircle,
  CheckCircle2,
  User,
  Tag,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import { safeFormatString } from '@/lib/utils/string-helpers';
import { Task } from '@/types/tasks';

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
};

const statusIcons = {
  todo: Clock,
  in_progress: AlertCircle,
  blocked: AlertCircle,
  review: AlertCircle,
  done: CheckCircle2
};

interface TaskTableViewProps {
  tasks?: Task[];
  onTaskClick?: (task: Task) => void;
  onUpdateTask?: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask?: (taskId: string) => void;
}

export default function TaskTableView({ tasks: propTasks, onTaskClick, onUpdateTask, onDeleteTask }: TaskTableViewProps) {
  const [tasks, setTasks] = useState<Task[]>(propTasks || []);
  const [loading, setLoading] = useState(!propTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [activeView, setActiveView] = useState('all');
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (propTasks) {
      setTasks(propTasks);
      setLoading(false);
    } else {
      loadTasks();
    }
  }, [propTasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data.data || []);
      } else {
        console.error('Failed to load tasks');
        setTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (onDeleteTask) {
      // Use parent's delete handler if provided
      onDeleteTask(taskId);
      return;
    }
    
    // Otherwise handle locally
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    setDeletingTaskId(taskId);
    
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Remove task from local state
        setTasks(prev => prev.filter(task => task.id !== taskId));
      } else {
        const error = await response.json();
        alert(`Failed to delete task: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Search filter
      const matchesSearch = (task.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.project_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
      
      // Priority filter  
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      
      // View-based filters
      let matchesView = true;
      if (activeView === 'my_tasks') {
        // This should check against current user ID
        matchesView = task.assigned_to?.includes('current-user') || false;
      } else if (activeView === 'overdue') {
        matchesView = task.due_date ? new Date(task.due_date) < new Date() : false;
      }
      
      return matchesSearch && matchesStatus && matchesPriority && matchesView;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, activeView]);

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      blocked: 'bg-red-100 text-red-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800'
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTaskMetrics = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length;
    
    return { total, completed, inProgress, overdue };
  };
  const metrics = getTaskMetrics();

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-600 text-2xl font-bold">{metrics.total}</div>
          <div className="text-blue-600 text-sm">Total Tasks</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-2xl font-bold">{metrics.completed}</div>
          <div className="text-green-600 text-sm">Completed</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-yellow-600 text-2xl font-bold">{metrics.inProgress}</div>
          <div className="text-yellow-600 text-sm">In Progress</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg">
          <div className="text-red-600 text-2xl font-bold">{metrics.overdue}</div>
          <div className="text-red-600 text-sm">Overdue</div>
        </div>
      </div>

      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">{/*30 lines*/}            <TabsTrigger value="all">All Tasks</TabsTrigger>
            <TabsTrigger value="my_tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeView} className="mt-0">
          {/* Filters Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">                  <tr>
                    <th className="text-left p-4 font-semibold">Task</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Priority</th>
                    <th className="text-left p-4 font-semibold">Assigned To</th>
                    <th className="text-left p-4 font-semibold">Project</th>
                    <th className="text-left p-4 font-semibold">Due Date</th>
                    <th className="text-left p-4 font-semibold">Time</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-gray-500">Loading tasks...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' 
                          ? 'No tasks match your filters'
                          : 'No tasks found. Create your first task to get started!'}                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const StatusIcon = statusIcons[task.status];
                      const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
                      const isDeleting = deletingTaskId === task.id;
                      
                      return (
                        <tr 
                          key={task.id} 
                          className={`border-b border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors ${isDeleting ? 'opacity-50' : ''}`}
                          onClick={() => !isDeleting && onTaskClick?.(task)}
                        >
                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-500 line-clamp-2">
                                  {task.description}
                                </div>
                              )}
                              {task.tags && (task.tags || []).length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {(task.tags || []).map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      <Tag className="h-3 w-3 mr-1" />
                                      {tag}                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={getStatusColor(task.status)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {safeFormatString(task.status, 'pending')}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge className={task.priority ? priorityColors[task.priority] : priorityColors.medium}>
                              {task.priority || 'medium'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {task.assigned_to && task.assigned_to.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {task.assigned_to[0].substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{task.assigned_to[0]}</span>
                                {task.assigned_to.length > 1 && (                                  <span className="text-xs text-gray-500">+{task.assigned_to.length - 1}</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-400">
                                <User className="h-4 w-4" />
                                <span className="text-sm">Unassigned</span>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-gray-600">{task.project_name || '—'}</span>
                          </td>
                          <td className="p-4">
                            {task.due_date ? (
                              <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm">{formatDate(task.due_date)}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No due date</span>
                            )}
                          </td>
                          <td className="p-4">
                            {task.estimated_hours !== undefined ? (
                              <div className="space-y-1 text-center">
                                <div className="text-sm font-medium">{task.actual_hours || 0}h</div>                                <div className="text-xs text-gray-500">of {task.estimated_hours}h</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" disabled={isDeleting}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Task Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    onTaskClick?.(task);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    onTaskClick?.(task);
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Task
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    const newStatus = task.status === 'done' ? 'todo' : 'done';
                                    onUpdateTask?.(task.id, { status: newStatus });
                                  }}
                                >
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  {task.status === 'done' ? 'Mark as Todo' : 'Mark as Done'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Task
                                </DropdownMenuItem>
                              </DropdownMenuContent>                            </DropdownMenu>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}