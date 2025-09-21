'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MoreVertical, 
  Calendar,
  Clock,
  MessageSquare,
  Paperclip,
  AlertCircle,
  CheckCircle,
  Flag
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Task } from '@/types/tasks';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onTaskClick: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete?: (taskId: string) => void;
  draggable?: boolean;
  isDragging?: boolean;
}

export default function TaskCard({ 
  task, 
  onTaskClick, 
  onTaskUpdate,
  onTaskDelete,
  draggable = true,
  isDragging = false
}: TaskCardProps) {

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };

  const statusIcons = {
    todo: null,
    in_progress: <Clock className="w-4 h-4 text-blue-500" />,
    blocked: <AlertCircle className="w-4 h-4 text-red-500" />,
    review: <MessageSquare className="w-4 h-4 text-purple-500" />,
    done: <CheckCircle className="w-4 h-4 text-green-500" />
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const handleQuickStatusChange = (status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done') => {
    if (onTaskUpdate) {
      onTaskUpdate(task.id, { status });
    }
  };

  return (
    <Card 
      className={cn(
        "p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow",
        draggable && "cursor-move",
        isDragging && "opacity-50",
        isOverdue && "border-red-300"
      )}
      onClick={() => onTaskClick(task)}
      draggable={draggable}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {statusIcons[task.status]}
          {task.task_type === 'milestone' && (
            <Flag className="w-4 h-4 text-purple-500" />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
            }}
          >
            <MoreVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleQuickStatusChange('todo')}>
              Mark as To Do
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickStatusChange('in_progress')}>
              Mark as In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleQuickStatusChange('done')}>
              Mark as Done
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => {
                if (onTaskDelete) {
                  onTaskDelete(task.id);
                }
              }}
            >
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm mb-1 line-clamp-2">
        {task.title}
      </h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
              {tag}
            </Badge>
          ))}
          {task.tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-1 py-0">
              +{task.tags.length - 3}
            </Badge>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        {/* Assignees */}
        <div className="flex -space-x-2">
          {task.assigned_to?.slice(0, 3).map((userId) => (
            <Avatar key={userId} className="w-6 h-6 border-2 border-white">
              <AvatarFallback className="text-xs">
                {userId.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {task.assigned_to?.length > 3 && (
            <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
              <span className="text-xs">+{task.assigned_to.length - 3}</span>
            </div>
          )}
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-2">
          {/* Priority */}
          {task.priority && (
            <Badge 
              variant="secondary" 
              className={cn("text-xs px-1 py-0", priorityColors[task.priority])}
            >
              {task.priority}
            </Badge>
          )}

          {/* Due Date */}
          {task.due_date && (
            <div className={cn(
              "flex items-center text-xs",
              isOverdue ? "text-red-600" : "text-gray-500"
            )}>
              <Calendar className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
            </div>
          )}

          {/* Comments */}
          {task.comment_count && task.comment_count > 0 && (
            <div className="flex items-center text-xs text-gray-500">
              <MessageSquare className="w-3 h-3 mr-1" />
              {task.comment_count}
            </div>
          )}

          {/* Attachments */}
          {task.attachments && Object.keys(task.attachments).length > 0 && (
            <Paperclip className="w-3 h-3 text-gray-500" />
          )}
        </div>
      </div>
    </Card>
  );
}