'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TaskTableView from '@/components/tasks/TaskTableView';
import PageHeader from '@/components/shared/PageHeader';
import {
  Plus,
  Calendar,
  Clock,
  Target,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  created_by?: string;
  due_date?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}

interface UpcomingDeadline {
  id: string;
  title: string;
  dueDate: string;
  priority: string;
}

interface RecentActivity {
  id: string;
  action: string;
  task: string;
  time: string;
}

export default function MyTasksPage() {
  const [timeFilter, setTimeFilter] = useState('this_week');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to load tasks: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setTasks(data.data);
        setError('');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setError('Failed to load tasks. Please try again.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Calculate stats from real tasks data
  const stats = useMemo((): TaskStats => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'done').length;
    const inProgress = tasks.filter(task => task.status === 'in_progress').length;
    const overdue = tasks.filter(task =>
      task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
    ).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, inProgress, overdue, completionRate };
  }, [tasks]);

  // Calculate upcoming deadlines from real tasks
  const upcomingDeadlines = useMemo((): UpcomingDeadline[] => {
    return tasks
      .filter(task => task.due_date && task.status !== 'done')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 3)
      .map(task => ({
        id: task.id,
        title: task.title,
        dueDate: task.due_date!,
        priority: task.priority
      }));
  }, [tasks]);

  const getRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  // Calculate recent activity from real tasks (based on updated_at)
  const recentActivity = useMemo((): RecentActivity[] => {
    return tasks
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 3)
      .map(task => ({
        id: task.id,
        action: task.status === 'done' ? 'Completed' : 'Updated',
        task: task.title,
        time: getRelativeTime(task.updated_at)
      }));
  }, [tasks]);

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className={`text-3xl font-bold ${color || 'text-slate-900'}`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color?.includes('green') ? 'bg-green-100' : 
                        color?.includes('blue') ? 'bg-blue-100' : 
                        color?.includes('red') ? 'bg-red-100' : 'bg-slate-100'}`}>
          <Icon className={`h-6 w-6 ${color || 'text-slate-600'}`} />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-8">
      <PageHeader 
        title="My Tasks"
        description="Manage your personal tasks and track progress"
        actions={
          <div className="flex gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadTasks} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        }
      />

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadTasks}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Target}
          title="Total Tasks"
          value={stats.total}
          subtitle="Active assignments"
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={stats.completed}
          subtitle={`${stats.completionRate}% completion rate`}
          color="text-green-600"
        />
        <StatCard
          icon={Clock}
          title="In Progress"
          value={stats.inProgress}
          subtitle="Currently active"
          color="text-blue-600"
        />
        <StatCard
          icon={AlertCircle}
          title="Overdue"
          value={stats.overdue}
          subtitle="Need attention"
          color="text-red-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Task View */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Task Overview</h3>
            </div>

            <TaskTableView />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Progress Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Week Progress</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Overall Completion</span>
                <span className="font-medium">{stats.completionRate}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-3" />
              <div className="text-xs text-slate-500">
                {stats.completed} of {stats.total} tasks completed
              </div>
            </div>
          </Card>

          {/* Upcoming Deadlines */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {upcomingDeadlines.length > 0 ? (
                upcomingDeadlines.map(deadline => (
                  <div key={deadline.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">
                        {deadline.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(deadline.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={deadline.priority === 'high' || deadline.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}
                    >
                      {deadline.priority}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No upcoming deadlines
                </div>
              )}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {activity.action === 'Completed' ? '✓' :
                         activity.action === 'Updated' ? '↗' : '💬'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{activity.action}</span>{' '}
                        <span className="text-slate-600">{activity.task}</span>
                      </p>
                      <p className="text-xs text-slate-500">{activity.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-slate-500 text-sm">
                  No recent activity
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}