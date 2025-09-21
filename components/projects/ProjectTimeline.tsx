'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  MoreHorizontal,
  Users,
  Target,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { safeFormatString } from '@/lib/utils/string-helpers';

interface TimelineMilestone {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'delayed';
  assignedTo: string[];
  dependencies: string[];
  color: string;
  notes?: string;
  projectId: string;
}

interface ProjectMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
}

// Note: Member data will come from project API when implemented

// Note: Milestone data will come from project milestones API when implemented

export default function ProjectTimeline({ projectId = 'proj-1' }: { projectId?: string }) {
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [, setLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'timeline' | 'gantt' | 'list'>('timeline');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  useEffect(() => {
    loadProjectTimeline();
  }, [projectId]);

  const loadProjectTimeline = async () => {
    try {
      setLoading(true);
      // For now, return empty arrays since project timeline API isn't implemented yet
      // When implemented, these would be:
      // const [milestonesResponse, membersResponse] = await Promise.all([
      //   fetch(`/api/projects/${projectId}/milestones`),
      //   fetch(`/api/projects/${projectId}/members`)
      // ]);
      
      setMilestones([]);
      setMembers([]);
    } catch (error) {
      console.error('Error loading project timeline:', error);
      setMilestones([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMilestones = useMemo(() => {
    return milestones
      .filter(m => m.projectId === projectId)
      .filter(m => filterStatus === 'all' || m.status === filterStatus)
      .filter(m => filterAssignee === 'all' || (m.assignedTo || "").includes(filterAssignee))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [milestones, projectId, filterStatus, filterAssignee]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle2;
      case 'in_progress': return PlayCircle;
      case 'delayed': return AlertCircle;
      case 'not_started': return PauseCircle;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'delayed': return 'text-red-600 bg-red-100';
      case 'not_started': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateRange = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getAssignedMembers = (assignedIds: string[]) => {
    return members.filter(member => assignedIds.includes(member.id));
  };

  const getDurationDays = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  };

  const isOverdue = (endDate: string, status: string) => {
    return status !== 'completed' && new Date(endDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2">
          <Button
            variant={selectedView === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('timeline')}
          >
            Timeline
          </Button>
          <Button
            variant={selectedView === 'gantt' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('gantt')}
          >
            Gantt
          </Button>
          <Button
            variant={selectedView === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('list')}
          >
            List
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      {/* Timeline View */}
      {selectedView === 'timeline' && (
        <div className="space-y-4">
          {filteredMilestones.map((milestone) => {
            const StatusIcon = getStatusIcon(milestone.status);
            const assignedMembers = getAssignedMembers(milestone.assignedTo);
            const overdue = isOverdue(milestone.endDate, milestone.status);
            
            return (
              <Card key={milestone.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: milestone.color }}
                        />
                        <div>
                          <h3 className="font-semibold text-gray-900">{milestone.name}</h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                                {getDateRange(milestone.startDate, milestone.endDate)}
                              </span>
                              {overdue && <span className="text-red-600">(Overdue)</span>}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{getDurationDays(milestone.startDate, milestone.endDate)} days</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(milestone.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {safeFormatString(milestone.status, 'not started')}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{milestone.progress}%</span>
                      </div>
                      <Progress value={milestone.progress} className="h-2" />
                    </div>

                    {/* Assignees and Dependencies */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {assignedMembers.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <div className="flex -space-x-2">
                              {assignedMembers.map(member => (
                                <Avatar key={member.id} className="h-6 w-6 border-2 border-white">
                                  <AvatarImage src={member.avatar} />
                                  <AvatarFallback className="text-xs">
                                    {(member.name || "").split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {assignedMembers.map(m => m.name).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {milestone.type}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    {/* Notes */}
                    {milestone.notes && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{milestone.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Gantt View Placeholder */}
      {selectedView === 'gantt' && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Target className="h-12 w-12 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Gantt Chart View</h3>
              <p className="text-gray-600">
                Advanced Gantt chart visualization coming soon. This will provide detailed project scheduling and dependency management.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* List View */}
      {selectedView === 'list' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold">Milestone</th>
                  <th className="text-left p-4 font-semibold">Type</th>
                  <th className="text-left p-4 font-semibold">Status</th>
                  <th className="text-left p-4 font-semibold">Progress</th>
                  <th className="text-left p-4 font-semibold">Dates</th>
                  <th className="text-left p-4 font-semibold">Assignees</th>
                  <th className="text-right p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMilestones.map(milestone => {
                  const StatusIcon = getStatusIcon(milestone.status);
                  const assignedMembers = getAssignedMembers(milestone.assignedTo);
                  const overdue = isOverdue(milestone.endDate, milestone.status);
                  
                  return (
                    <tr key={milestone.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: milestone.color }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{milestone.name}</div>
                            {milestone.notes && (
                              <div className="text-sm text-gray-500 line-clamp-1 mt-1">
                                {milestone.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {milestone.type}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusColor(milestone.status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {safeFormatString(milestone.status, 'not started')}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <Progress value={milestone.progress} className="w-16 h-2" />
                          <span className="text-sm text-gray-600">{milestone.progress}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`text-sm ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {getDateRange(milestone.startDate, milestone.endDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getDurationDays(milestone.startDate, milestone.endDate)} days
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex -space-x-2">
                          {assignedMembers.slice(0, 3).map(member => (
                            <Avatar key={member.id} className="h-6 w-6 border-2 border-white">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">
                                {(member.name || "").split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {assignedMembers.length > 3 && (
                            <div className="h-6 w-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                              <span className="text-xs text-gray-600">+{assignedMembers.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredMilestones.length === 0 && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">No Milestones Found</h3>
              <p className="text-gray-600">
                No milestones match your current filters. Try adjusting the status or assignee filters, or create a new milestone.
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add First Milestone
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}