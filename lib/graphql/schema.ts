export const typeDefs = `
  type Query {
    # Orders
    orders(tenantId: String!, filters: OrderFilters): [Order!]!
    order(tenantId: String!, id: ID!): Order
    
    # Customers  
    customers(tenantId: String!, filters: CustomerFilters): [Customer!]!
    customer(tenantId: String!, id: ID!): Customer
    
    # Products
    products(tenantId: String!, filters: ProductFilters): [Product!]!
    product(tenantId: String!, id: ID!): Product
    
    # Materials
    materials(tenantId: String!, filters: MaterialFilters): [Material!]!
    material(tenantId: String!, id: ID!): Material
    
    # AI Predictions
    predictions(tenantId: String!, filters: PredictionFilters): [Prediction!]!
    prediction(tenantId: String!, id: ID!): Prediction
    
    # Analytics
    analytics(tenantId: String!, type: AnalyticsType!, filters: AnalyticsFilters!): AnalyticsResult!
    
    # Notifications
    notifications(tenantId: String!, filters: NotificationFilters): [Notification!]!
  }

  type Mutation {
    # Orders
    createOrder(tenantId: String!, input: OrderInput!): OrderResult!
    updateOrder(tenantId: String!, id: ID!, input: OrderUpdateInput!): OrderResult!
    
    # Customers
    createCustomer(tenantId: String!, input: CustomerInput!): CustomerResult!
    updateCustomer(tenantId: String!, id: ID!, input: CustomerUpdateInput!): CustomerResult!
    
    # Products
    createProduct(tenantId: String!, input: ProductInput!): ProductResult!
    updateProduct(tenantId: String!, id: ID!, input: ProductUpdateInput!): ProductResult!
    
    # AI Predictions
    createPrediction(tenantId: String!, input: PredictionInput!): PredictionResult!
    
    # Notifications
    markNotificationAsRead(tenantId: String!, id: ID!): NotificationResult!
    markAllNotificationsAsRead(tenantId: String!): BatchResult!
  }

  type Subscription {
    # Real-time order updates
    orderUpdated(tenantId: String!): Order!
    
    # Real-time notifications
    notificationReceived(tenantId: String!, userId: String!): Notification!
    
    # Real-time predictions
    predictionCompleted(tenantId: String!): Prediction!
  }

  # Order Types
  type Order {
    id: ID!
    order_number: String!
    customer: Customer
    status: OrderStatus!
    total_amount: Float!
    currency: String!
    items: [OrderItem!]!
    created_at: String!
    updated_at: String!
    due_date: String
    notes: String
    metadata: JSON
  }

  type OrderItem {
    id: ID!
    product: Product
    quantity: Int!
    unit_price: Float!
    total_price: Float!
    specifications: JSON
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    IN_PRODUCTION
    QUALITY_CHECK
    READY_TO_SHIP
    SHIPPED
    DELIVERED
    CANCELLED
  }

  input OrderInput {
    customer_id: ID!
    items: [OrderItemInput!]!
    due_date: String
    notes: String
    metadata: JSON
  }

  input OrderItemInput {
    product_id: ID!
    quantity: Int!
    unit_price: Float!
    specifications: JSON
  }

  input OrderUpdateInput {
    status: OrderStatus
    due_date: String
    notes: String
    metadata: JSON
  }

  input OrderFilters {
    status: [OrderStatus!]
    customer_id: ID
    date_range: DateRangeInput
    search: String
    limit: Int
    offset: Int
  }

  type OrderResult {
    success: Boolean!
    data: Order
    error: String
  }

  # Customer Types
  type Customer {
    id: ID!
    name: String!
    email: String
    phone: String
    company: String
    address: Address
    orders: [Order!]
    created_at: String!
    updated_at: String!
    metadata: JSON
  }

  type Address {
    street: String
    city: String
    state: String
    country: String
    postal_code: String
  }

  input CustomerInput {
    name: String!
    email: String
    phone: String
    company: String
    address: AddressInput
    metadata: JSON
  }

  input CustomerUpdateInput {
    name: String
    email: String
    phone: String
    company: String
    address: AddressInput
    metadata: JSON
  }

  input AddressInput {
    street: String
    city: String
    state: String
    country: String
    postal_code: String
  }

  input CustomerFilters {
    search: String
    company: String
    limit: Int
    offset: Int
  }

  type CustomerResult {
    success: Boolean!
    data: Customer
    error: String
  }

  # Product Types
  type Product {
    id: ID!
    name: String!
    description: String
    sku: String
    category: String
    price: Float!
    currency: String!
    dimensions: ProductDimensions
    materials: [Material!]
    is_active: Boolean!
    created_at: String!
    updated_at: String!
    metadata: JSON
  }

  type ProductDimensions {
    length: Float
    width: Float
    height: Float
    weight: Float
    unit: String
  }

  input ProductInput {
    name: String!
    description: String
    sku: String
    category: String
    price: Float!
    currency: String!
    dimensions: ProductDimensionsInput
    metadata: JSON
  }

  input ProductUpdateInput {
    name: String
    description: String
    sku: String
    category: String
    price: Float
    dimensions: ProductDimensionsInput
    is_active: Boolean
    metadata: JSON
  }

  input ProductDimensionsInput {
    length: Float
    width: Float
    height: Float
    weight: Float
    unit: String
  }

  input ProductFilters {
    category: String
    is_active: Boolean
    search: String
    price_range: PriceRangeInput
    limit: Int
    offset: Int
  }

  input PriceRangeInput {
    min: Float
    max: Float
  }

  type ProductResult {
    success: Boolean!
    data: Product
    error: String
  }

  # Material Types
  type Material {
    id: ID!
    name: String!
    description: String
    category: String
    unit_cost: Float!
    currency: String!
    supplier: String
    stock_quantity: Float!
    reorder_level: Float!
    is_active: Boolean!
    created_at: String!
    updated_at: String!
  }

  input MaterialFilters {
    category: String
    supplier: String
    is_active: Boolean
    search: String
    limit: Int
    offset: Int
  }

  # AI Prediction Types
  type Prediction {
    id: ID!
    model_type: String!
    entity_type: String
    entity_id: ID
    prediction_type: String!
    input_data: JSON!
    prediction_data: JSON!
    confidence_score: Float
    status: PredictionStatus!
    created_at: String!
    expires_at: String
    model_version: String
  }

  enum PredictionStatus {
    ACTIVE
    EXPIRED
    INVALID
  }

  input PredictionInput {
    model_type: String!
    entity_type: String
    entity_id: ID
    prediction_type: String!
    input_data: JSON!
  }

  input PredictionFilters {
    model_type: String
    entity_type: String
    prediction_type: String
    status: PredictionStatus
    limit: Int
    offset: Int
  }

  type PredictionResult {
    success: Boolean!
    data: Prediction
    error: String
  }

  # Analytics Types
  enum AnalyticsType {
    REVENUE
    ORDERS
    CUSTOMERS
    PRODUCTS
    INVENTORY
    PRODUCTION
  }

  input AnalyticsFilters {
    date_range: DateRangeInput!
    granularity: Granularity
    filters: JSON
  }

  enum Granularity {
    DAY
    WEEK
    MONTH
    QUARTER
    YEAR
  }

  type AnalyticsResult {
    type: AnalyticsType!
    data: [AnalyticsDataPoint!]!
    summary: AnalyticsSummary!
    generated_at: String!
  }

  type AnalyticsDataPoint {
    period: String!
    value: Float!
    metadata: JSON
  }

  type AnalyticsSummary {
    total: Float!
    average: Float!
    growth_rate: Float
    period_over_period_change: Float
    metadata: JSON
  }

  # Notification Types
  type Notification {
    id: ID!
    recipient_id: String!
    type: String!
    title: String!
    message: String!
    category: String!
    priority: NotificationPriority!
    read_at: String
    archived_at: String
    metadata: JSON
    created_at: String!
  }

  enum NotificationPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  input NotificationFilters {
    type: String
    category: String
    priority: NotificationPriority
    is_read: Boolean
    limit: Int
    offset: Int
  }

  type NotificationResult {
    success: Boolean!
    data: Notification
    error: String
  }

  # Common Types
  input DateRangeInput {
    start: String!
    end: String!
  }

  type BatchResult {
    success: Boolean!
    affected_count: Int!
    error: String
  }

  scalar JSON
  scalar DateTime
`