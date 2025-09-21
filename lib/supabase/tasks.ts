import { createClient } from './client';

export const tasksService = {
  async getTasks() {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('v_task_overview')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createTask(task: Record<string, unknown>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateTask(id: string, updates: Record<string, unknown>) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};