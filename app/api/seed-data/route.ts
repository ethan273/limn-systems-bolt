/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Block in production environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Seed data endpoint disabled in production' }, { status: 403 })
    }

    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Seed Data API: Starting to seed test data for user:', user.email)

    // Since we don't have clients/projects/orders tables, let's seed data in existing tables
    
    // 1. Seed test collections
    const testCollections = [
      {
        name: 'Test Collection - Hotel Furniture',
        description: 'Sample collection for hotel renovation project',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .insert(testCollections)
      .select('*')

    if (collectionsError) {
      console.error('Collections seed error:', collectionsError)
      return NextResponse.json(
        { error: 'Failed to seed collections', details: collectionsError.message },
        { status: 500 }
      )
    }

    console.log('Seed Data API: Created collections:', collections?.length || 0)

    // 2. Seed test tasks (check if table exists and handle array field)
    let tasks = []
    let tasksError = null
    
    try {
      // First check what the table structure expects by trying to insert minimal data
      const testTasks = [
        {
          title: 'Review Hotel Renovation Requirements',
          description: 'Review all requirements for the hotel renovation project and create detailed specifications.',
          status: 'pending',
          priority: 'high',
          assigned_to: [user.email], // Try as array first
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Source Furniture Items',
          description: 'Find and source appropriate furniture items for guest rooms and lobby areas.',
          status: 'in_progress',
          priority: 'medium',
          assigned_to: [user.email],
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          title: 'Coordinate Delivery Schedule',
          description: 'Work with hotel management to coordinate furniture delivery and installation.',
          status: 'pending',
          priority: 'low',
          assigned_to: [user.email],
          due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      const { data: tasksData, error: insertError } = await supabase
        .from('tasks')
        .insert(testTasks)
        .select('*')

      if (insertError && insertError.message.includes('malformed array literal')) {
        // Try again without array format
        const testTasksString = testTasks.map(task => ({
          ...task,
          assigned_to: user.email // Use string instead of array
        }))

        const { data: tasksData2, error: insertError2 } = await supabase
          .from('tasks')
          .insert(testTasksString)
          .select('*')

        tasks = tasksData2 || []
        tasksError = insertError2
      } else {
        tasks = tasksData || []
        tasksError = insertError
      }
    } catch (error) {
      console.error('Tasks seed error:', error)
      tasksError = error
    }

    if (tasksError) {
      console.error('Final tasks seed error:', tasksError)
      // Don't fail the entire seeding process, just log the error
      console.log('Seed Data API: Skipping tasks due to error')
    } else {
      console.log('Seed Data API: Created tasks:', tasks?.length || 0)
    }

    // 3. Try to seed a test item if the items table exists
    let testItems = []
    const { error: itemsCheckError } = await supabase
      .from('items')
      .select('*')
      .limit(1)

    if (!itemsCheckError) {
      // Items table exists, seed some test items
      const testItemsData = [
        {
          name: 'Hotel Lobby Chair - Executive',
          sku: `CHAIR-EXEC-${Date.now()}`,
          description: 'Premium executive chair for hotel lobby areas',
          base_price: 450.00,
          category: 'Seating',
          subcategory: 'Chairs',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]

      const { data: items, error: itemsSeedError } = await supabase
        .from('items')
        .insert(testItemsData)
        .select('*')

      if (!itemsSeedError && items) {
        testItems = items
        console.log('Seed Data API: Created items:', items.length)
      }
    }

    const seedSummary = {
      collections: {
        count: collections?.length || 0,
        names: collections?.map((c: any) => c.name) || []
      },
      tasks: {
        count: tasks?.length || 0,
        titles: tasks?.map((t: Record<string, unknown>) => t.title) || []
      },
      items: {
        count: testItems.length,
        names: testItems.map((item: Record<string, unknown>) => item.name)
      }
    }

    console.log('Seed Data API: Successfully seeded all test data')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test data seeded successfully!',
      data: seedSummary
    })

  } catch (error) {
    console.error('Seed Data API error:', error)
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}