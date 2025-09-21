import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Creating tasks table for user:', user.email)

    // First check if tasks table exists
    const { error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'tasks')

    if (tablesError) {
      console.log('Could not check for existing tables, proceeding with creation attempt')
    }

    // Create the tasks table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
        priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        assigned_to VARCHAR(255),
        created_by VARCHAR(255) NOT NULL,
        due_date TIMESTAMP WITH TIME ZONE,
        project_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    const { error: createError } = await supabase.rpc('create_tasks_table', {
      sql_query: createTableSQL
    })

    // If RPC doesn't work, try direct SQL execution (this might not work in client but worth trying)
    if (createError) {
      console.log('RPC approach failed, trying direct SQL execution')
      
      // Try a simple approach - insert a dummy record to create table structure
      try {
        const sampleTask = {
          id: '00000000-0000-0000-0000-000000000000',
          title: 'Sample Task',
          description: 'This is a sample task to initialize the table',
          status: 'todo',
          priority: 'medium',
          assigned_to: user.email,
          created_by: user.email,
          due_date: null,
          project_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { error: insertError } = await supabase
          .from('tasks')
          .insert([sampleTask])

        if (!insertError) {
          // If insert worked, table exists, delete the sample
          await supabase
            .from('tasks')
            .delete()
            .eq('id', '00000000-0000-0000-0000-000000000000')
          
          return NextResponse.json({
            success: true,
            message: 'Tasks table verified/created successfully',
            method: 'insert_test'
          })
        }

        return NextResponse.json({
          error: 'Failed to create tasks table',
          details: `RPC Error: ${createError?.message}, Insert Error: ${insertError?.message}`,
          suggestion: 'Please create the tasks table manually in your Supabase dashboard'
        }, { status: 500 })

      } catch {
        return NextResponse.json({
          error: 'Failed to create tasks table',
          details: `${createError?.message}. Insert test also failed.`,
          suggestion: 'Please create the tasks table manually in your Supabase dashboard using the provided SQL'
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Tasks table created successfully',
      sql: createTableSQL
    })

  } catch (error) {
    console.error('Create tasks table error:', error)
    return NextResponse.json({
      error: 'Failed to create tasks table',
      details: error instanceof Error ? error.message : 'Unknown error',
      sql_suggestion: `
        You can manually create the tasks table in Supabase with this SQL:

        CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
          priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          assigned_to VARCHAR(255),
          created_by VARCHAR(255) NOT NULL,
          due_date TIMESTAMP WITH TIME ZONE,
          project_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    }, { status: 500 })
  }
}