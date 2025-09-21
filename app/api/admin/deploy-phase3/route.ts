import { createClient } from '@/lib/supabase/service'
import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdminSecurity, auditAdminEvent } from '@/lib/security/admin-security'
import { adminRateLimit } from '@/lib/rate-limiting/middleware'
import fs from 'fs'
import path from 'path'

export const POST = adminRateLimit(withSuperAdminSecurity(async (request: NextRequest, { user, session }) => {
  await auditAdminEvent('system_configuration_change', {
    userId: user.id,
    userEmail: user.email,
    action: 'deploy_phase3_attempt',
    resource: 'system_deployment',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { phase: 3, method: 'POST', timestamp: new Date().toISOString() }
  })
  
  try {
    // Read the Phase 3 database schema file
    const schemaPath = path.join(process.cwd(), 'phase3-database-schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Create service client with admin privileges
    const supabase = createClient()
    
    // Split the SQL into individual statements (rough approach)
    const statements = schemaSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    const results = []
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { 
            sql_statement: statement + ';' 
          })
          
          if (error) {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`, error)
            results.push({ statement: statement.substring(0, 100), error: error.message })
          } else {
            results.push({ statement: statement.substring(0, 100), success: true })
          }
        } catch (err) {
          console.error(`Exception executing statement: ${statement.substring(0, 100)}...`, err)
          results.push({ statement: statement.substring(0, 100), error: String(err) })
        }
      }
    }
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'deploy_phase3_success',
      resource: 'system_deployment',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        phase: 3, 
        method: 'POST', 
        statementsExecuted: statements.length,
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Phase 3 database deployment completed',
      results,
      totalStatements: statements.length
    })
    
  } catch (error) {
    console.error('Phase 3 deployment error:', error)
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'deploy_phase3_failed',
      resource: 'system_deployment',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        phase: 3, 
        method: 'POST',
        error: String(error),
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy Phase 3 database schema',
      details: String(error)
    }, { status: 500 })
  }
}))

// Alternative approach using direct SQL execution
export const PUT = adminRateLimit(withSuperAdminSecurity(async (request: NextRequest, { user, session }) => {
  await auditAdminEvent('system_configuration_change', {
    userId: user.id,
    userEmail: user.email,
    action: 'deploy_phase3_attempt',
    resource: 'system_deployment',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { phase: 3, method: 'PUT', timestamp: new Date().toISOString() }
  })
  
  try {
    const supabase = createClient()
    
    // Read the Phase 3 database schema file
    const schemaPath = path.join(process.cwd(), 'phase3-database-schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    // Execute the entire schema as one operation
    const { data, error } = await supabase.rpc('exec', { 
      sql: schemaSql 
    })
    
    if (error) {
      await auditAdminEvent('system_configuration_change', {
        userId: user.id,
        userEmail: user.email,
        action: 'deploy_phase3_failed',
        resource: 'system_deployment',
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        metadata: { 
          phase: 3, 
          method: 'PUT',
          error: JSON.stringify(error),
          timestamp: new Date().toISOString() 
        }
      })
      
      return NextResponse.json({
        success: false,
        error: 'Failed to execute Phase 3 schema',
        details: error
      }, { status: 500 })
    }
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'deploy_phase3_success',
      resource: 'system_deployment',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        phase: 3, 
        method: 'PUT',
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Phase 3 database schema deployed successfully',
      data
    })
    
  } catch (error) {
    console.error('Phase 3 deployment error:', error)
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'deploy_phase3_failed',
      resource: 'system_deployment',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: { 
        phase: 3, 
        method: 'PUT',
        error: String(error),
        timestamp: new Date().toISOString() 
      }
    })
    
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy Phase 3 database schema',
      details: String(error)
    }, { status: 500 })
  }
}))