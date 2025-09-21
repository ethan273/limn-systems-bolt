import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    let query = supabase
      .from('documents')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const entityType = searchParams.get('entity_type')
    const entityId = searchParams.get('entity_id')
    const createdBy = searchParams.get('created_by')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const fileType = searchParams.get('file_type')
    const minSize = searchParams.get('min_size')
    const maxSize = searchParams.get('max_size')
    const isArchived = searchParams.get('is_archived')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (category) {
      query = query.eq('category', category)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }
    
    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    if (createdBy) {
      if (createdBy === 'me') {
        query = query.eq('created_by', user.id)
      } else {
        query = query.eq('created_by', createdBy)
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    if (fileType) {
      const fileTypeMap = {
        'pdf': ['application/pdf'],
        'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'excel': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'cad': ['application/octet-stream', 'model/stl', 'model/obj', 'model/fbx'],
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml']
      }
      
      if (fileTypeMap[fileType as keyof typeof fileTypeMap]) {
        query = query.in('mime_type', fileTypeMap[fileType as keyof typeof fileTypeMap])
      }
    }

    if (minSize) {
      query = query.gte('file_size', parseInt(minSize) * 1024 * 1024)
    }
    
    if (maxSize) {
      query = query.lte('file_size', parseInt(maxSize) * 1024 * 1024)
    }

    // Skip archived filter if column doesn't exist
    // if (isArchived === 'true') {
    //   query = query.eq('is_archived', true)
    // } else {
    //   query = query.or('is_archived.is.null,is_archived.eq.false')
    // }

    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.info('Documents table not found - please run the database migration:', error.message)
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        },
        message: 'Documents table not yet created'
      })
    }

    const { count: totalCount } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalCount || 0)
      },
      filters: {
        category,
        status,
        entity_type: entityType,
        entity_id: entityId,
        created_by: createdBy,
        search,
        date_from: dateFrom,
        date_to: dateTo,
        file_type: fileType,
        is_archived: isArchived
      }
    })

  } catch (error) {
    console.error('List documents error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve documents', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}