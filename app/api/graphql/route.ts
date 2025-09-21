import { NextRequest, NextResponse } from 'next/server'
import { buildSchema, graphql } from 'graphql'
import { typeDefs } from '@/lib/graphql/schema'
import { resolvers } from '@/lib/graphql/resolvers'
import { createClient } from '@/lib/supabase/service'

// Build GraphQL schema
const schema = buildSchema(typeDefs)

// Helper function to get user context from request
async function getUserContext(request: NextRequest) {
  try {
    // Get authorization header
    const authorization = request.headers.get('authorization')
    if (!authorization || !authorization.startsWith('Bearer ')) {
      throw new Error('No valid authorization token provided')
    }

    const token = authorization.replace('Bearer ', '')
    
    // Verify token with Supabase
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      throw new Error('Invalid or expired token')
    }

    return { user }
  } catch {
    throw new Error('Authentication failed')
  }
}

// GraphQL executor function
async function executeGraphQL(
  query: string,
  variables: unknown,
  context: unknown,
  operationName?: string
) {
  try {
    const result = await graphql({
      schema,
      source: query,
      rootValue: resolvers,
      contextValue: context,
      variableValues: variables as { readonly [variable: string]: unknown } | undefined,
      operationName
    })

    return result
  } catch (error) {
    console.error('GraphQL execution error:', error)
    return {
      errors: [{ message: 'Internal server error' }]
    }
  }
}

// POST handler for GraphQL queries/mutations
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const { query, variables, operationName } = await request.json()
    
    if (!query) {
      return NextResponse.json(
        { errors: [{ message: 'Query is required' }] },
        { status: 400 }
      )
    }

    // Get user context (for authenticated queries)
    let context = {}
    try {
      context = await getUserContext(request)
    } catch {
      // For public queries, we might allow anonymous access
      // For now, all queries require authentication
      return NextResponse.json(
        { errors: [{ message: 'Authentication required' }] },
        { status: 401 }
      )
    }

    // Execute GraphQL query
    const result = await executeGraphQL(query, variables, context, operationName)
    
    // Return result
    return NextResponse.json(result)

  } catch (error) {
    console.error('GraphQL API error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Invalid request' }] },
      { status: 400 }
    )
  }
}

// GET handler for GraphQL introspection and schema exploration
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  
  // Check if this is a schema introspection request
  if (url.searchParams.get('schema') === 'true') {
    return NextResponse.json({
      schema: typeDefs,
      endpoints: {
        graphql: '/api/graphql',
        playground: '/api/graphql/playground'
      },
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <your_jwt_token>',
        description: 'All requests require a valid Supabase JWT token'
      }
    })
  }
  
  // Return GraphQL playground HTML for development
  if (process.env.NODE_ENV === 'development') {
    const playgroundHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Limn Systems GraphQL API</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; }
            h2 { color: #666; margin-top: 30px; }
            pre { 
              background: #f8f8f8; 
              padding: 15px; 
              border-radius: 4px; 
              overflow-x: auto;
              border-left: 4px solid #007acc;
            }
            .endpoint {
              background: #007acc;
              color: white;
              padding: 2px 8px;
              border-radius: 3px;
              font-family: monospace;
            }
            .method {
              background: #28a745;
              color: white;
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 12px;
              margin-right: 8px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Limn Systems GraphQL API</h1>
            <p>Welcome to the Limn Systems GraphQL API. This is a comprehensive API for managing orders, customers, products, materials, AI predictions, and real-time notifications.</p>
            
            <h2>📍 Endpoints</h2>
            <p><span class="method">POST</span> <span class="endpoint">/api/graphql</span> - GraphQL queries and mutations</p>
            <p><span class="method">GET</span> <span class="endpoint">/api/graphql?schema=true</span> - Schema information</p>
            
            <h2>🔐 Authentication</h2>
            <p>All requests require authentication using a Bearer token in the Authorization header:</p>
            <pre>Authorization: Bearer &lt;your_jwt_token&gt;</pre>
            
            <h2>🔍 Sample Query</h2>
            <pre>
query GetOrders($tenantId: String!) {
  orders(tenantId: $tenantId, filters: { limit: 10 }) {
    id
    order_number
    status
    total_amount
    currency
    customer {
      id
      name
      email
    }
    items {
      id
      quantity
      unit_price
      product {
        name
        sku
      }
    }
    created_at
  }
}
            </pre>
            
            <h2>🔧 Sample Mutation</h2>
            <pre>
mutation CreateOrder($tenantId: String!, $input: OrderInput!) {
  createOrder(tenantId: $tenantId, input: $input) {
    success
    data {
      id
      order_number
      status
      total_amount
    }
    error
  }
}
            </pre>
            
            <h2>🤖 AI Predictions</h2>
            <pre>
mutation CreateDemandForecast($tenantId: String!) {
  createPrediction(tenantId: $tenantId, input: {
    model_type: "demand_forecasting"
    prediction_type: "demand_forecast"
    entity_type: "product"
    entity_id: "product_id_here"
    input_data: {
      product_id: "product_id"
      historical_sales: [
        { date: "2024-01-01", quantity: 100, revenue: 1000 }
      ]
      forecast_period_days: 30
    }
  }) {
    success
    data {
      id
      prediction_data
      confidence_score
    }
    error
  }
}
            </pre>
            
            <h2>📊 Analytics Query</h2>
            <pre>
query GetRevenueAnalytics($tenantId: String!) {
  analytics(
    tenantId: $tenantId
    type: REVENUE
    filters: {
      date_range: {
        start: "2024-01-01"
        end: "2024-12-31"
      }
      granularity: MONTH
    }
  ) {
    type
    data {
      period
      value
    }
    summary {
      total
      average
      growth_rate
    }
  }
}
            </pre>
            
            <h2>🔔 Real-time Subscriptions</h2>
            <p>For real-time features, use WebSockets with the real-time service alongside GraphQL for data fetching.</p>
            
            <h2>📚 Schema</h2>
            <p>Visit <a href="/api/graphql?schema=true">/api/graphql?schema=true</a> for the complete GraphQL schema.</p>
            
            <p><strong>Note:</strong> This playground is only available in development mode.</p>
          </div>
        </body>
      </html>
    `
    
    return new NextResponse(playgroundHtml, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
  
  // Production: Return API information
  return NextResponse.json({
    name: 'Limn Systems GraphQL API',
    version: '3.0.0',
    description: 'Enterprise GraphQL API for Limn Systems',
    endpoints: {
      graphql: '/api/graphql',
      schema: '/api/graphql?schema=true'
    },
    features: [
      'Multi-tenant architecture',
      'AI/ML predictions',
      'Real-time notifications',
      'Advanced analytics',
      'Complete CRUD operations',
      'Role-based access control'
    ],
    authentication: 'Bearer Token (Supabase JWT) required'
  })
}