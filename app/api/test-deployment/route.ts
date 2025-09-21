import { NextResponse } from 'next/server'

export async function GET() {
  console.log('🔥 TEST DEPLOYMENT ROUTE HIT - STAGING DEPLOYMENT WORKS!')
  
  return NextResponse.json({
    success: true,
    message: 'Deployment working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  })
}