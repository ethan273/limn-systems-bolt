import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Get environment info
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    // Test Supabase connection
    let supabaseStatus = 'unknown';
    try {
      const supabase = await createClient();
      const { error } = await supabase.from('customers').select('count').limit(1);
      supabaseStatus = error ? `error: ${error.message}` : 'connected';
    } catch (error) {
      supabaseStatus = `error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    // Prepare health check response
    const healthCheck = {
      status: 'healthy',
      environment,
      nodeEnv,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      services: {
        database: supabaseStatus,
        api: 'operational'
      },
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      }
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Support OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
