import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('order_items')
    .insert({
      ...body,
      order_id: id
    })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const body = await request.json()
  const { item_id, ...updates } = body

  const { data, error } = await supabase
    .from('order_items')
    .update(updates)
    .eq('id', item_id)
    .eq('order_id', id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('item_id')

  const { error } = await supabase
    .from('order_items')
    .delete()
    .eq('id', itemId)
    .eq('order_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}