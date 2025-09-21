'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Target,
  TrendingUp,
  Plus,
  Filter,
  PieChart as PieChartIcon,
  Activity,
  Star,
  Flame,
  Award
} from 'lucide-react';
import { Task } from '@/types/tasks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format, startOfWeek, endOfWeek, isWithinInterval, subDays } from 'date-fns';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface MyTasksProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export default function MyTasks({ tasks, onTaskClick }: MyTasksProps) {
  const [activeView, setActiveView] = useState('overview');

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    // Filter tasks for current user (simplified - in real app would use actual user ID)
    const myTasks = tasks.filter(task => 
      task.assigned_to?.some(assignee => assignee === 'current_user_id') || 
      task.created_by === 'current_user_id'
    );

    // Total counts
    const totalTasks = myTasks.length;
    const completedTasks = myTasks.filter(t => t.status === 'done').length;
    const inProgressTasks = myTasks.filter(t => t.status === 'in_progress').length;
    const blockedTasks = myTasks.filter(t => t.status === 'blocked').length;

    // Due today/overdue
    const overdueTasks = myTasks.filter(t => 
      t.due_date && new Date(t.due_date) < todayStart && t.status !== 'done'
    );
    const dueTodayTasks = myTasks.filter(t => 
      t.due_date && isWithinInterval(new Date(t.due_date), { start: todayStart, end: todayEnd }) && t.status !== 'done'
    );

    // Due this week
    const dueThisWeekTasks = myTasks.filter(t => 
      t.due_date && isWithinInterval(new Date(t.due_date), { start: weekStart, end: weekEnd }) && t.status !== 'done'
    );

    // Priority breakdown
    const highPriorityTasks = myTasks.filter(t => t.priority === 'high' || t.priority === 'urgent').length;
    
    // Status distribution
    const statusDistribution = [
      { name: 'To Do', value: myTasks.filter(t => t.status === 'todo').length, color: '#94a3b8' },
      { name: 'In Progress', value: inProgressTasks, color: '#3b82f6' },
      { name: 'Blocked', value: blockedTasks, color: '#ef4444' },
      { name: 'Review', value: myTasks.filter(t => t.status === 'review').length, color: '#8b5cf6' },
      { name: 'Done', value: completedTasks, color: '#10b981' }
    ];

    // Completion trend (last 7 days)
    const completionTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const completedOnDay = myTasks.filter(t => 
        t.completed_at && isWithinInterval(new Date(t.completed_at), { start: dayStart, end: dayEnd })
      ).length;

      completionTrend.push({
        date: format(date, 'MMM dd'),
        completed: completedOnDay
      });
    }

    // Completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      overdueTasks,
      dueTodayTasks,
      dueThisWeekTasks,
      highPriorityTasks,
      completionRate,
      statusDistribution: statusDistribution.filter(s => s.value > 0),
      completionTrend,
      myTasks
    };
  }, [tasks]);

  // Get tasks by category for quick views
  const urgentTasks = stats.myTasks
    .filter(t => t.priority === 'urgent' && t.status !== 'done')
    .slice(0, 5);

  const recentlyUpdated = stats.myTasks
    .filter(t => t.status !== 'done')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const upcomingDeadlines = stats.myTasks
    .filter(t => t.due_date && t.status !== 'done')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Priority badge
  const renderPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700'
    };
    return (
      <Badge variant="secondary" className={colors[priority as keyof typeof colors]}>
        {priority}
      </Badge>
    );
  };

  // Status badge
  const renderStatusBadge = (status: string) => {
    const colors = {
      todo: 'bg-slate-100 text-slate-700',
      in_progress: 'bg-blue-100 text-blue-700',
      blocked: 'bg-red-100 text-red-700',
      review: 'bg-purple-100 text-purple-700',
      done: 'bg-green-100 text-green-700'
    };
    return (
      <Badge variant="secondary" className={colors[status as keyof typeof colors]}>
        {safeFormatString(status, 'unknown')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#4b4949]">My Tasks Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your personal task progress and productivity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                <p className="text-2xl font-bold text-[#4b4949]">{stats.totalTasks}</p>
              </div>
              <div className="w-12 h-12 bg-[#91bdbd]/20 rounded-full flex items-center justify-center">
                <Target className="w-6 h-6 text-[#91bdbd]" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={stats.completionRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{stats.completionRate}% completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{(stats.overdueTasks || []).length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {(stats.dueTodayTasks || []).length} due today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              {stats.blockedTasks} blocked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-orange-600">{stats.highPriorityTasks}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Need attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="urgent">Urgent</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChartIcon className="w-5 h-5 mr-2 text-[#91bdbd]" />
                  Task Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {(stats.statusDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(stats.statusDistribution || []).map((status) => (
                    <div key={status.name} className="flex items-center gap-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: status.color }}
                      />
                      <span className="text-xs text-gray-600">
                        {status.name} ({status.value})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Completion Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-[#91bdbd]" />
                  Completion Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.completionTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="completed" 
                        stroke="#91bdbd" 
                        strokeWidth={2}
                        dot={{ fill: '#91bdbd', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-[#91bdbd]" />
                Recently Updated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentlyUpdated.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => onTaskClick(task)}
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStatusBadge(task.status)}
                        {renderPriorityBadge(task.priority)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urgent Tab */}
        <TabsContent value="urgent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Urgent Tasks ({urgentTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                  <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                  <p className="text-gray-600">No urgent tasks at the moment</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {urgentTasks.map(task => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStatusBadge(task.status)}
                          {task.due_date && (
                            <div className="text-xs text-red-600">
                              Due {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="destructive">Urgent</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Tab */}
        <TabsContent value="upcoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-[#91bdbd]" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingDeadlines.map(task => {
                  const dueDate = new Date(task.due_date!);
                  const isOverdue = dueDate < new Date();
                  const isDueSoon = dueDate < new Date(Date.now() + 24 * 60 * 60 * 1000);

                  return (
                    <div 
                      key={task.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer",
                        isOverdue ? "bg-red-50 border border-red-200 hover:bg-red-100" :
                        isDueSoon ? "bg-orange-50 border border-orange-200 hover:bg-orange-100" :
                        "bg-gray-50 hover:bg-gray-100"
                      )}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStatusBadge(task.status)}
                          {renderPriorityBadge(task.priority)}
                        </div>
                      </div>
                      <div className={cn(
                        "text-xs font-medium",
                        isOverdue ? "text-red-600" :
                        isDueSoon ? "text-orange-600" : "text-gray-600"
                      )}>
                        {format(dueDate, 'MMM d, yyyy')}
                        <br />
                        {formatDistanceToNow(dueDate, { addSuffix: true })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <p className="text-2xl font-bold text-[#4b4949]">{stats.completedTasks}</p>
                <p className="text-sm text-gray-600">Tasks Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <p className="text-2xl font-bold text-[#4b4949]">{stats.completionRate}%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-2xl font-bold text-[#4b4949]">
                  {(stats.completionTrend || []).slice(-1)[0]?.completed || 0}
                </p>
                <p className="text-sm text-gray-600">Completed Today</p>
              </CardContent>
            </Card>
          </div>

          {/* Performance Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">This Week</h4>
                  <p className="text-sm text-gray-600">
                    • {(stats.dueThisWeekTasks || []).length} tasks due
                  </p>
                  <p className="text-sm text-gray-600">
                    • {(stats.completionTrend || []).slice(-7).reduce((sum, day) => sum + day.completed, 0)} completed
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Focus Areas</h4>
                  <p className="text-sm text-gray-600">
                    • {(stats.overdueTasks || []).length > 0 ? 'Clear overdue tasks' : 'Stay on track'}
                  </p>
                  <p className="text-sm text-gray-600">
                    • {stats.highPriorityTasks > 0 ? `Focus on ${stats.highPriorityTasks} high priority` : 'Maintain momentum'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}