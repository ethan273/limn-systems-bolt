import { NextResponse, NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createCustomerSchema } from '@/lib/validation/schemas'
import { z } from 'zod'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limiting/middleware'
import { errorResponses } from '@/lib/error-handling/error-middleware'
import { secureLogger } from '@/lib/logging/secure-logger'
import { withCaching, CacheConfigs, CacheManager } from '@/lib/performance/caching-middleware'

// TypeScript interfaces
// type CreateCustomerData = z.infer<typeof createCustomerSchema> // Currently unused

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  company_name?: string
  type: string
  status: string
  address?: string
  created_at: string
}

async function getCustomersHandler(request: NextRequest): Promise<NextResponse> {
  // Apply read operations rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.read_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  try {
    const supabase = await createServerSupabaseClient()

    // Get URL search parameters (pagination and sorting support ready for future implementation)
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10) 
    const sortBy = searchParams.get('sortBy') || 'company_name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // Get customers with basic info needed for invoice creation
    let customers: Customer[] = []
    try {
      // Build query with pagination and sorting
      let query = supabase
        .from('customers')
        .select(`
          id,
          name,
          email,
          phone,
          company,
          company_name,
          type,
          status,
          portal_access,
          address,
          city,
          state,
          zip,
          created_at
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' })

      // Apply pagination
      if (limit > 0) {
        const offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
      }

      const { data, error } = await query

      if (error && error.code === 'PGRST205') {
        // Table doesn't exist yet - return empty array
        customers = []
      } else if (error) {
        return await errorResponses.database(error, request)
      } else {
        customers = data || []
      }
    } catch {
      customers = []
    }

    return NextResponse.json({
      success: true,
      data: customers
    })

  } catch (error) {
    return await errorResponses.internal(error as Error, request)
  }
}

// Apply caching to GET requests
export const GET = withCaching(
  getCustomersHandler,
  CacheConfigs.MEDIUM, // 15 minutes cache
  {
    keyPrefix: 'customers',
    includeParams: ['page', 'limit', 'sortBy', 'sortOrder'],
    cachePredicate: (request, response) => {
      // Only cache successful responses with data
      return response.status === 200;
    }
  }
)

export async function POST(request: NextRequest) {
  // Apply write operations rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimitConfigs.write_operations)
  if (!rateLimitResult.success) {
    return rateLimitResult.response!
  }
  
  try {
    const body = await request.json()
    const validatedData = createCustomerSchema.parse(body)
    const supabase = await createServerSupabaseClient()

      // Check if customer with this email already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', validatedData.email)
        .single()

      if (existingCustomer) {
        return await errorResponses.businessLogic(
          'Customer with this email already exists',
          request,
          undefined,
          { email: validatedData.email }
        )
      }

      // Create the customer
      const { data: customer, error: createError } = await supabase
        .from('customers')
        .insert([validatedData])
        .select()
        .single()

      if (createError) {
        return await errorResponses.database(createError, request)
      }

      // Invalidate customers cache since data has changed
      const invalidatedCount = CacheManager.invalidate('customers');
      
      await secureLogger.info('Customer created, cache invalidated', {
        customerId: customer.id,
        email: validatedData.email,
        cacheEntriesInvalidated: invalidatedCount
      })

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return await errorResponses.validation(error, request)
    }
    return await errorResponses.internal(error as Error, request)
  }
}