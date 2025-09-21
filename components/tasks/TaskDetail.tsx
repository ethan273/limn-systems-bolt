// TaskDetail Component - Task Details Modal
// Full implementation in GitHub repo
import { Task } from '@/types/tasks';
import { X } from 'lucide-react';

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

export default function TaskDetail({ task, onClose, onUpdate }: TaskDetailProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">{task.title}</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-600 mb-4">{task.description}</p>
        <div className="space-y-2">
          <p>Status: {task.status}</p>
          <p>Priority: {task.priority}</p>
          {task.due_date && <p>Due: {new Date(task.due_date).toLocaleDateString()}</p>}
        </div>
        <button 
          onClick={() => onUpdate(task.id, { status: 'done' })}
          className="mt-4 px-4 py-2 bg-[#88c0c0] text-white rounded hover:bg-[#76a8a8]"
        >
          Mark as Done
        </button>
      </div>
    </div>
  );
}