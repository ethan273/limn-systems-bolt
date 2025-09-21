'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import TaskCard from './TaskCard';
import { Task } from '@/types/tasks';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void;
  onTaskDelete: (taskId: string) => void;
  onCreateTask?: (status: string) => void;
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-slate-50' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-50' },
  { id: 'review', title: 'Review', color: 'bg-purple-50' },
  { id: 'done', title: 'Done', color: 'bg-teal-50' }
];

export default function TaskBoard({ 
  tasks, 
  onTaskClick, 
  onTaskUpdate, 
  onTaskDelete,
  onCreateTask 
}: TaskBoardProps) {
  const [boardTasks, setBoardTasks] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    // Group tasks by status
    const grouped: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      blocked: [],
      review: [],
      done: []
    };

    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Sort tasks within each column by position or created date
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        if (a.position !== undefined && b.position !== undefined) {
          return a.position - b.position;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });

    setBoardTasks(grouped);
  }, [tasks]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    // If dropped in same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = boardTasks[source.droppableId];
    const destColumn = boardTasks[destination.droppableId];
    const task = sourceColumn.find(t => t.id === draggableId);

    if (!task) return;

    // Create new arrays
    const newSourceColumn = Array.from(sourceColumn);
    const newDestColumn = source.droppableId === destination.droppableId 
      ? newSourceColumn 
      : Array.from(destColumn);

    // Remove from source
    newSourceColumn.splice(source.index, 1);

    // Add to destination
    if (source.droppableId === destination.droppableId) {
      newSourceColumn.splice(destination.index, 0, task);
    } else {
      newDestColumn.splice(destination.index, 0, task);
    }

    // Update local state
    const newBoardTasks: Record<string, Task[]> = {
      ...boardTasks,
      [source.droppableId]: newSourceColumn
    };

    if (source.droppableId !== destination.droppableId) {
      newBoardTasks[destination.droppableId] = newDestColumn;
    }

    setBoardTasks(newBoardTasks);

    // Update task status if moved to different column
    if (source.droppableId !== destination.droppableId) {
      onTaskUpdate(draggableId, {
        status: destination.droppableId as 'todo' | 'in_progress' | 'blocked' | 'review' | 'done',
        position: destination.index
      });
    } else {
      // Just update position
      onTaskUpdate(draggableId, { 
        position: destination.index 
      });
    }
  };

  return (    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(column => {
          const columnTasks = boardTasks[column.id] || [];
          const taskCount = columnTasks.length;

          return (
            <div 
              key={column.id}
              className="flex-shrink-0 w-80"
            >
              {/* Column Header */}
              <div className={cn(
                "rounded-t-lg px-4 py-3 mb-3 border-b",
                column.color
              )}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm uppercase text-slate-700 tracking-wide">
                    {column.title}
                  </h3>
                  <span className="text-xs text-slate-600 bg-white px-2 py-1 rounded-full font-medium shadow-sm">
                    {taskCount}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "min-h-[200px] px-2",
                      snapshot.isDraggingOver && "bg-slate-100 rounded-lg"
                    )}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable 
                        key={task.id} 
                        draggableId={task.id} 
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={provided.draggableProps.style}
                          >
                            <TaskCard
                              task={task}
                              onTaskClick={onTaskClick}
                              onTaskUpdate={onTaskUpdate}
                              onTaskDelete={onTaskDelete}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Add Task Button */}
              {onCreateTask && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 justify-start text-gray-500 hover:text-gray-700"
                  onClick={() => onCreateTask(column.id)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add task
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}