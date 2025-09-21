'use client'

import { useState } from 'react';
import { Task } from '@/types/tasks';
import { X } from 'lucide-react';
import { FormValidator, CommonSchemas } from '@/lib/validation/form-validator';
import { 
  FormContainer, 
  InputField, 
  TextareaField,
  SelectField, 
  FormActions, 
  SubmitButton,
  FormErrorSummary
} from '@/components/ui/form';
import { SelectItem } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { useUsers } from '@/hooks/useUsers';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (task: Partial<Task>) => void;
}

export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps) {
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    task_type: 'task',
    department: 'admin',
    visibility: 'company',
    assigned_to: [],
    mentioned_users: [],
    start_date: '',
    due_date: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userOptions, loading: usersLoading } = useUsers();

  const validateForm = (): boolean => {
    const validation = FormValidator.validate(CommonSchemas.taskForm, formData);
    
    if (!validation.success) {
      setErrors(validation.errors || {});
      return false;
    }
    
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Transform the data to match API expectations
      const apiData = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        assignedTo: formData.assigned_to, // Convert to camelCase
        dueDate: formData.due_date, // Convert to camelCase
        department: formData.department,
        visibility: formData.visibility,
        mentioned_users: formData.mentioned_users,
        task_type: formData.task_type
      };

      await onCreate(apiData);
    } catch (error) {
      console.error('Error creating task:', error);
      setErrors({ general: 'Failed to create task. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Create New Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <FormContainer onSubmit={handleSubmit}>
          <FormErrorSummary errors={errors} />
          
          <InputField
            label="Task Title"
            value={formData.title || ''}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            placeholder="Enter task title"
            error={errors.title}
            required
          />

          <TextareaField
            label="Description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            placeholder="Task description (optional)"
            error={errors.description}
            maxLength={500}
            rows={3}
          />

          <SelectField
            label="Priority"
            value={formData.priority}
            onValueChange={(value) => handleFieldChange('priority', value)}
            error={errors.priority}
            required
          >
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectField>

          <SelectField
            label="Department"
            value={formData.department}
            onValueChange={(value) => handleFieldChange('department', value)}
            error={errors.department}
            required
          >
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="sales">Sales</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="finance">Finance</SelectItem>
          </SelectField>

          <SelectField
            label="Visibility"
            value={formData.visibility}
            onValueChange={(value) => handleFieldChange('visibility', value)}
            error={errors.visibility}
            required
          >
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="department">Department</SelectItem>
            <SelectItem value="company">Company</SelectItem>
          </SelectField>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Assign to Team Members
            </label>
            <MultiSelect
              options={userOptions}
              selected={formData.assigned_to || []}
              onChange={(selected) => handleFieldChange('assigned_to', selected)}
              placeholder={usersLoading ? "Loading users..." : "Select team members..."}
              disabled={usersLoading}
              className="w-full"
            />
            {errors.assigned_to && (
              <p className="text-sm text-red-600">{errors.assigned_to}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Start Date"
              type="date"
              value={formData.start_date ? (typeof formData.start_date === 'string' ? formData.start_date : formData.start_date.toISOString().split('T')[0]) : ''}
              onChange={(e) => handleFieldChange('start_date', e.target.value)}
              error={errors.start_date}
            />
            
            <InputField
              label="Due Date"
              type="date"
              value={formData.due_date ? (typeof formData.due_date === 'string' ? formData.due_date : formData.due_date.toISOString().split('T')[0]) : ''}
              onChange={(e) => handleFieldChange('due_date', e.target.value)}
              error={errors.due_date}
            />
          </div>

          <FormActions>
            <SubmitButton 
              loading={isSubmitting}
              loadingText="Creating Task..."
              className="w-full"
            >
              Create Task
            </SubmitButton>
          </FormActions>
        </FormContainer>
      </div>
    </div>
  );
}