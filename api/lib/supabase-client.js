// Supabase Client Configuration
// Shared client for API routes

import { createClient } from '@supabase/supabase-js';

// Create Supabase client for server-side operations
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Create Supabase client for client-side operations
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to get user from request
export async function getUserFromRequest(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error) {
    console.error('Auth error:', error);
    return null;
  }

  return user;
}

// Helper to check user permissions
export async function checkUserPermission(userId, permission) {
  const { data, error } = await supabaseAdmin
    .from('user_document_permissions')
    .select(permission)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    // Default permissions if no record exists
    const defaults = {
      can_access_documents: true,
      can_download: true,
      can_upload: true,
      can_delete: false,
      can_approve: false,
      can_share: false,
    };
    return defaults[permission] ?? false;
  }

  return data[permission] ?? false;
}

export default supabase;