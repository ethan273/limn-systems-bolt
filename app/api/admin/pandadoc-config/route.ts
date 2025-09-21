import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { withSuperAdminSecurity, auditAdminEvent } from '@/lib/security/admin-security'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

const ENV_FILE_PATH = join(process.cwd(), '.env.local')

export const GET = withSuperAdminSecurity(async (request: NextRequest, { user, session }) => {
  await auditAdminEvent('sensitive_data_access', {
    userId: user.id,
    userEmail: user.email,
    action: 'view_pandadoc_config',
    resource: 'system_configuration',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { timestamp: new Date().toISOString() }
  })
  
  try {
    // Return current config (without exposing the actual API key)
    const config = {
      apiKey: process.env.PANDADOC_API_KEY ? '••••••••••••••••' : '',
      invoiceTemplateId: process.env.PANDADOC_INVOICE_TEMPLATE_ID || '',
      ndaTemplateId: process.env.PANDADOC_NDA_TEMPLATE_ID || '',
      msaTemplateId: process.env.PANDADOC_MSA_TEMPLATE_ID || '',
      hasApiKey: !!process.env.PANDADOC_API_KEY
    }

    return NextResponse.json({ success: true, config })
  } catch (error) {
    console.error('Error getting config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = withSuperAdminSecurity(async (request: NextRequest, { user, session }) => {
  await auditAdminEvent('system_configuration_change', {
    userId: user.id,
    userEmail: user.email,
    action: 'update_pandadoc_config_attempt',
    resource: 'system_configuration',
    sessionId: session.sessionId,
    ipAddress: session.ipAddress,
    metadata: { timestamp: new Date().toISOString() }
  })
  
  try {
    const supabase = await createServerSupabaseClient()

    const body = await request.json()
    const { apiKey, invoiceTemplateId, ndaTemplateId, msaTemplateId } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Read existing .env.local file
    let envContent = ''
    try {
      envContent = await readFile(ENV_FILE_PATH, 'utf-8')
    } catch {
      // File doesn't exist, create new content
      envContent = '# Environment variables\\n'
    }

    // Update or add PandaDoc environment variables
    const envLines = envContent.split('\\n')
    const pandadocVars = {
      'PANDADOC_API_KEY': apiKey,
      'PANDADOC_INVOICE_TEMPLATE_ID': invoiceTemplateId || '',
      'PANDADOC_NDA_TEMPLATE_ID': ndaTemplateId || '',
      'PANDADOC_MSA_TEMPLATE_ID': msaTemplateId || ''
    }

    // Remove existing PandaDoc variables
    const filteredLines = envLines.filter(line => 
      !line.startsWith('PANDADOC_')
    )

    // Add new PandaDoc variables
    Object.entries(pandadocVars).forEach(([key, value]) => {
      if (value) {
        filteredLines.push(`${key}=${value}`)
      }
    })

    // Write back to file
    const newEnvContent = filteredLines.join('\\n')
    await writeFile(ENV_FILE_PATH, newEnvContent, 'utf-8')

    // Log the configuration change
    await supabase
      .from('activity_logs')
      .insert({
        user_id: user.id,
        action: 'update_pandadoc_config',
        entity_type: 'system',
        details: {
          hasApiKey: !!apiKey,
          hasInvoiceTemplate: !!invoiceTemplateId,
          hasNdaTemplate: !!ndaTemplateId,
          hasMsaTemplate: !!msaTemplateId
        }
      })
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'update_pandadoc_config_success',
      resource: 'system_configuration',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: {
        hasApiKey: !!apiKey,
        hasInvoiceTemplate: !!invoiceTemplateId,
        hasNdaTemplate: !!ndaTemplateId,
        hasMsaTemplate: !!msaTemplateId,
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration saved successfully. Please restart the development server to apply changes.' 
    })

  } catch (error) {
    console.error('Error saving config:', error)
    
    await auditAdminEvent('system_configuration_change', {
      userId: user.id,
      userEmail: user.email,
      action: 'update_pandadoc_config_failed',
      resource: 'system_configuration',
      sessionId: session.sessionId,
      ipAddress: session.ipAddress,
      metadata: {
        error: String(error),
        timestamp: new Date().toISOString()
      }
    })
    
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
  }
})