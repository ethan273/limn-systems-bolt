/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication - using getUser() for security
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get collections from the database
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .order('display_order', { ascending: true, nullsLast: true })

    if (collectionsError) {
      console.error('Collections query error:', collectionsError)
      return NextResponse.json(
        { error: 'Failed to fetch collections', details: collectionsError.message },
        { status: 500 }
      )
    }

    // Map database columns to frontend interface
    const mappedCollections = (collections || []).map((collection: any) => ({
      id: collection.id,
      name: collection.name,
      prefix: collection.prefix || '',
      description: collection.description || '',
      image_url: collection.image_url || '',
      display_order: collection.display_order || 1,
      is_active: collection.is_active !== false,
      designer: collection.metadata?.designer || '',
      created_at: collection.created_at,
      updated_at: collection.updated_at
    }))

    return NextResponse.json({ success: true, data: mappedCollections })
  } catch (error) {
    console.error('Collections GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication - using getUser() for security
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Map frontend fields to database columns
    const collectionData = {
      name: body.name,
      prefix: body.prefix,
      description: body.description,
      image_url: body.image_url || '',
      display_order: body.display_order || 1,
      is_active: body.is_active !== false,
      metadata: {
        designer: body.designer || user.email
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Insert collection
    const { data: collection, error } = await supabase
      .from('collections')
      .insert([collectionData])
      .select('*')
      .single()

    if (error) {
      console.error('Collection creation error:', error)
      return NextResponse.json(
        { error: 'Failed to create collection', details: error.message },
        { status: 500 }
      )
    }

    // Map response back to frontend format
    const mappedCollection = {
      id: collection.id,
      name: collection.name,
      prefix: collection.prefix,
      description: collection.description,
      image_url: collection.image_url,
      display_order: collection.display_order,
      is_active: collection.is_active,
      designer: collection.metadata?.designer || '',
      created_at: collection.created_at,
      updated_at: collection.updated_at
    }

    return NextResponse.json({ success: true, data: mappedCollection }, { status: 201 })
  } catch (error) {
    console.error('Collections POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    )
  }
}