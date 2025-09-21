'use client';
 

import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Plus,
  CheckSquare,
  List,
  Grid3X3,
  Users,
  User,
  Search
} from 'lucide-react';
import TaskBoard from '@/components/tasks/TaskBoard';
import TaskTableView from '@/components/tasks/TaskTableView';
import TaskDetail from '@/components/tasks/TaskDetail';
import CreateTaskModal from '@/components/tasks/CreateTaskModal';
import TaskFilters from '@/components/tasks/TaskFilters';
import TaskSearch from '@/components/tasks/TaskSearch';
import { Task, TaskFilter } from '@/types/tasks';
import { Badge } from '@/components/ui/badge';
import { useUsers } from '@/hooks/useUsers';
import { createClient } from '@/lib/supabase/client';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { userOptions } = useUsers();
  const [filters, setFilters] = useState<TaskFilter>({
    status: 'all',
    priority: 'all',
    assignee: 'all',
    project: 'all',
    dateRange: 'all',
    department: 'all',
    visibility: 'all'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const supabase = createClient();

  // Load tasks
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/tasks', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setTasks(result.data || []);
    } catch (err) {
      console.log('Tasks API error (expected if table does not exist):', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser({ id: user.id, email: user.email || '' });
      }
    };
    getUser();
  }, [supabase]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter tasks based on active tab and filters
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Tab filters
    if (activeTab === 'my_tasks' && !task.assigned_to?.includes(user?.id || '')) return false;
    if (activeTab === 'team' && task.visibility === 'private') return false;
    if (activeTab === 'high_priority' && !['high', 'urgent'].includes(task.priority || '')) return false;
    if (activeTab === 'overdue' && (!task.due_date || new Date(task.due_date) >= new Date())) return false;
    if (activeTab === 'completed' && task.status !== 'done') return false;

    // Apply filters from TaskFilters component
    if (filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
    if (filters.assignee !== 'all' && !task.assigned_to?.includes(filters.assignee)) return false;
    if (filters.department !== 'all' && task.department !== filters.department) return false;
    if (filters.visibility !== 'all' && task.visibility !== filters.visibility) return false;

    // Date range filter
    if (filters.dateRange !== 'all' && task.due_date) {
      const dueDate = new Date(task.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (filters.dateRange) {
        case 'today':
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          if (dueDate < today || dueDate >= tomorrow) return false;
          break;
        case 'week':
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);
          if (dueDate >= nextWeek) return false;
          break;
        case 'month':
          const nextMonth = new Date(today);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          if (dueDate >= nextMonth) return false;
          break;
      }
    }

    return true;
  });

  // Task actions
  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(prev => prev.map(task =>
          task.id === taskId ? data.data : task
        ));
        // Update selected task if it's the one being updated
        if (selectedTask?.id === taskId) {
          setSelectedTask(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        if (selectedTask?.id === taskId) {
          setSelectedTask(null);
        }
      } else {
        const error = await response.json();
        alert(`Failed to delete task: ${error.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert('Failed to delete task');
    }
  };

  const handleCreateTask = async (taskData: Partial<Task>) => {
    try {
      // Map field names to match API expectations
      const apiData = {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        assignedTo: taskData.assigned_to, // Map to camelCase
        dueDate: taskData.due_date, // Map to camelCase
        projectId: taskData.project_id,
        department: taskData.department,
        visibility: taskData.visibility,
        mentioned_users: taskData.mentioned_users,
        task_type: taskData.task_type
      };

      const response = await fetch('/api/tasks', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [newTask.data, ...prev]); // Add to top of list
        setShowCreateModal(false);
        // Show success feedback
        console.log('Task created successfully:', newTask.data.title);
      } else {
        const errorData = await response.json();
        console.error('Failed to create task:', errorData);
        alert(`Failed to create task: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
      alert('Failed to create task. Please try again.');
    }
  };

  // Get task counts for tabs
  const taskCounts = {
    all: tasks.length,
    my_tasks: tasks.filter(t => t.assigned_to?.includes(user?.id || '')).length,
    team: tasks.filter(t => t.visibility === 'department' || t.visibility === 'company').length,
    high_priority: tasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length,
    completed: tasks.filter(t => t.status === 'done').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-600 mt-1">Manage and track project tasks, assignments, and team collaboration</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSearch(true)}
            className="hidden sm:flex"
          >
            <Search className="h-4 w-4 mr-2" />
            Search
            <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Tasks System Status</div>
              <p>The tasks table may not exist in your database yet. Error: {error}</p>
              <div className="bg-slate-50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium text-slate-600 mb-2">To enable tasks, create the table in your Supabase dashboard:</p>
                <code className="text-xs text-slate-600 font-mono whitespace-pre-wrap">{`CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'todo',
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to TEXT[],
  created_by VARCHAR(255) NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  project_id VARCHAR(255),
  department VARCHAR(50) DEFAULT 'admin',
  visibility VARCHAR(50) DEFAULT 'company',
  task_type VARCHAR(50) DEFAULT 'task',
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}</code>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              All
              <Badge variant="secondary">{taskCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="my_tasks" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              My Tasks
              <Badge variant="secondary">{taskCounts.my_tasks}</Badge>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team
              <Badge variant="secondary">{taskCounts.team}</Badge>
            </TabsTrigger>
            <TabsTrigger value="high_priority" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              High Priority
              <Badge variant="destructive">{taskCounts.high_priority}</Badge>
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue
              <Badge variant="destructive">{taskCounts.overdue}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Completed
              <Badge variant="outline">{taskCounts.completed}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* View Mode Toggle */}
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Advanced Filters */}
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClearFilters={() => setFilters({
              status: 'all',
              priority: 'all',
              assignee: 'all',
              project: 'all',
              dateRange: 'all',
              department: 'all',
              visibility: 'all'
            })}
            userOptions={userOptions}
          />

          {/* Main Content */}
          {filteredTasks.length === 0 && !error ? (
            <div className="text-center py-12">
              <CheckSquare className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No tasks found</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by creating your first task.</p>
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'kanban' && (
                <TaskBoard
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onTaskUpdate={handleUpdateTask}
                  onTaskDelete={handleDeleteTask}
                />
              )}
              
              {viewMode === 'list' && (
                <TaskTableView 
                  tasks={filteredTasks}
                  onTaskClick={handleTaskClick}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(taskId: string, updates: Partial<Task>) => {
            handleUpdateTask(taskId, updates);
            setSelectedTask({ ...selectedTask, ...updates });
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTask}
        />
      )}

      {/* Search Modal */}
      {showSearch && (
        <TaskSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          tasks={tasks}
          onSearch={(query) => {
            setSearchQuery(query);
          }}
          onTaskSelect={(task) => {
            setSelectedTask(task);
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}