export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  task_type?: 'task' | 'milestone' | 'epic';
  
  created_by: string;
  assigned_to: string[];
  watchers?: string[];
  
  // Enhanced fields for Session 1
  department?: 'design' | 'production' | 'sales' | 'admin' | 'finance';
  visibility?: 'private' | 'department' | 'company';
  mentioned_users?: string[];
  
  parent_task_id?: string;
  project_id?: string;
  order_id?: string;
  customer_id?: string;
  
  due_date?: string | Date;
  start_date?: string | Date;
  completed_at?: string | Date;
  estimated_hours?: number;
  actual_hours?: number;
  
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  attachments?: Record<string, unknown>;
  
  depends_on?: string[];
  blocks?: string[];
  
  position?: number;
  is_archived?: boolean;
  
  created_at: string;
  updated_at: string;
  
  // From views
  project_name?: string;
  customer_name?: string;
  order_number?: string;
  parent_task_title?: string;
  comment_count?: number;
  urgency?: 'overdue' | 'due_soon' | 'on_track';
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_email: string;
  comment: string;
  mentions?: string[];
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TaskFilter {
  status: string;
  priority: string;
  assignee: string;
  project: string;
  dateRange: string;
  department: string;
  visibility: string;
}