import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  return NextResponse.json({
    success: true,
    message: 'Dynamic route working on Vercel!',
    id: id,
    timestamp: new Date().toISOString()
  })
}