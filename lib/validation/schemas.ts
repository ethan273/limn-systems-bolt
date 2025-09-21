import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format')
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
export const urlSchema = z.string().url('Invalid URL format')
export const uuidSchema = z.string().uuid('Invalid UUID format')

// User and Authentication schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters')
})

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain lowercase, uppercase, and number'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export const passwordResetSchema = z.object({
  email: emailSchema
})

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain lowercase, uppercase, and number'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

// Customer schemas
export const customerSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  address: z.string().max(200, 'Address too long').optional(),
  city: z.string().max(50, 'City name too long').optional(),
  state: z.string().max(50, 'State name too long').optional(),
  zipCode: z.string().max(10, 'ZIP code too long').optional(),
  country: z.string().max(50, 'Country name too long').optional(),
  portalAccess: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional()
})

export const createCustomerSchema = customerSchema.omit({ id: true })
export const updateCustomerSchema = customerSchema.partial()

// Contact schemas
export const contactSchema = z.object({
  id: uuidSchema.optional(),
  customerId: uuidSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  phone: phoneSchema.optional(),
  title: z.string().max(100, 'Title too long').optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(500, 'Notes too long').optional()
})

export const createContactSchema = contactSchema.omit({ id: true })
export const updateContactSchema = contactSchema.partial().omit({ id: true })

// Order schemas
export const orderItemSchema = z.object({
  itemId: uuidSchema,
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive'),
  notes: z.string().max(500, 'Notes too long').optional()
})

export const orderSchema = z.object({
  id: uuidSchema.optional(),
  customerId: uuidSchema,
  orderNumber: z.string().min(1, 'Order number is required').max(50, 'Order number too long'),
  status: z.enum(['draft', 'pending', 'in_progress', 'completed', 'cancelled', 'shipped']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  notes: z.string().max(1000, 'Notes too long').optional(),
  shippingAddress: z.string().max(500, 'Shipping address too long').optional()
})

export const createOrderSchema = orderSchema.omit({ id: true })
export const updateOrderSchema = orderSchema.partial().omit({ id: true })

// Item/Product schemas
export const itemSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Item name is required').max(100, 'Item name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  sku: z.string().min(1, 'SKU is required').max(50, 'SKU too long'),
  category: z.string().max(50, 'Category name too long').optional(),
  unitPrice: z.number().positive('Unit price must be positive'),
  costPrice: z.number().positive('Cost price must be positive').optional(),
  weight: z.number().positive('Weight must be positive').optional(),
  dimensions: z.string().max(100, 'Dimensions too long').optional(),
  material: z.string().max(100, 'Material description too long').optional(),
  color: z.string().max(50, 'Color description too long').optional(),
  status: z.enum(['active', 'inactive', 'discontinued']).optional(),
  minQuantity: z.number().int().nonnegative('Minimum quantity cannot be negative').optional(),
  leadTime: z.number().int().positive('Lead time must be positive').optional()
})

export const createItemSchema = itemSchema.omit({ id: true })
export const updateItemSchema = itemSchema.partial().omit({ id: true })

// Designer schemas
export const designerSchema = z.object({
  id: uuidSchema.optional(),
  userId: uuidSchema,
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: emailSchema,
  specialties: z.array(z.string().max(50, 'Specialty too long')).optional(),
  status: z.enum(['active', 'inactive', 'busy']).optional(),
  hourlyRate: z.number().positive('Hourly rate must be positive').optional()
})

export const createDesignerSchema = designerSchema.omit({ id: true })
export const updateDesignerSchema = designerSchema.partial().omit({ id: true })

// Design Project schemas
export const designProjectSchema = z.object({
  id: uuidSchema.optional(),
  orderId: uuidSchema,
  designerId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  status: z.enum(['draft', 'in_progress', 'review', 'approved', 'rejected', 'completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().positive('Estimated hours must be positive').optional(),
  actualHours: z.number().nonnegative('Actual hours cannot be negative').optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
})

export const createDesignProjectSchema = designProjectSchema.omit({ id: true })
export const updateDesignProjectSchema = designProjectSchema.partial().omit({ id: true })

// Document schemas
export const documentSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['quote', 'invoice', 'contract', 'drawing', 'specification', 'other']),
  customerId: uuidSchema.optional(),
  orderId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  filePath: z.string().min(1, 'File path is required'),
  fileSize: z.number().int().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
  uploadedBy: uuidSchema,
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional()
})

export const uploadDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(255, 'Document name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['quote', 'invoice', 'contract', 'drawing', 'specification', 'other']),
  customerId: uuidSchema.optional(),
  orderId: uuidSchema.optional(),
  projectId: uuidSchema.optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string().max(50, 'Tag too long')).optional()
})

// Workflow schemas
export const workflowStepSchema = z.object({
  id: z.string().min(1, 'Step ID is required'),
  name: z.string().min(1, 'Step name is required').max(100, 'Step name too long'),
  type: z.enum(['manual', 'automated', 'approval', 'notification']),
  assigneeId: uuidSchema.optional(),
  estimatedDuration: z.number().int().positive('Duration must be positive').optional(),
  dependencies: z.array(z.string()).optional(),
  conditions: z.record(z.string(), z.any()).optional()
})

export const workflowSchema = z.object({
  id: uuidSchema.optional(),
  name: z.string().min(1, 'Workflow name is required').max(100, 'Workflow name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  category: z.string().max(50, 'Category too long').optional(),
  isActive: z.boolean().optional(),
  steps: z.array(workflowStepSchema).min(1, 'At least one step is required'),
  triggers: z.array(z.string()).optional()
})

export const createWorkflowSchema = workflowSchema.omit({ id: true })
export const updateWorkflowSchema = workflowSchema.partial().omit({ id: true })

// API parameter validation schemas
export const paginationSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').transform(Number).optional(),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').transform(Number).optional(),
  sortBy: z.string().max(50, 'Sort field too long').optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  category: z.string().max(50, 'Category too long').optional(),
  status: z.string().max(50, 'Status filter too long').optional()
})

export const idParamsSchema = z.object({
  id: uuidSchema
})

// File upload validation
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => {
    if (!file) return false
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ]
    return file.size <= maxSize && allowedTypes.includes(file.type)
  }, 'Invalid file type or size (max 10MB)')
})

// Batch operation schemas
export const batchDeleteSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one ID is required').max(100, 'Too many IDs')
})

export const batchUpdateStatusSchema = z.object({
  ids: z.array(uuidSchema).min(1, 'At least one ID is required').max(100, 'Too many IDs'),
  status: z.string().min(1, 'Status is required').max(50, 'Status too long')
})

// Report schemas
export const reportParamsSchema = z.object({
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  customerId: uuidSchema.optional(),
  status: z.string().max(50, 'Status filter too long').optional(),
  format: z.enum(['json', 'csv', 'pdf']).optional()
}).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
  message: 'Start date must be before end date',
  path: ['endDate']
})

// Notification schemas
export const notificationSchema = z.object({
  id: uuidSchema.optional(),
  userId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(500, 'Message too long'),
  type: z.enum(['info', 'success', 'warning', 'error']),
  isRead: z.boolean().optional(),
  actionUrl: urlSchema.optional(),
  expiresAt: z.string().datetime().optional()
})

export const createNotificationSchema = notificationSchema.omit({ id: true })

// Settings schemas
export const userSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().max(10, 'Language code too long').optional(),
  timezone: z.string().max(50, 'Timezone too long').optional(),
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  dashboardLayout: z.record(z.string(), z.any()).optional()
})

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(100, 'Company name too long'),
  address: z.string().max(200, 'Address too long').optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  website: urlSchema.optional(),
  logo: z.string().url().optional(),
  timezone: z.string().max(50, 'Timezone too long').optional(),
  currency: z.string().length(3, 'Currency code must be 3 characters').optional(),
  fiscalYearStart: z.string().regex(/^\d{2}-\d{2}$/, 'Fiscal year start must be MM-DD format').optional()
})

// Export all schemas for easy importing
export const validationSchemas = {
  // Auth
  loginSchema,
  registerSchema,
  passwordResetSchema,
  updatePasswordSchema,
  
  // Customers & Contacts
  customerSchema,
  createCustomerSchema,
  updateCustomerSchema,
  contactSchema,
  createContactSchema,
  updateContactSchema,
  
  // Orders & Items
  orderSchema,
  createOrderSchema,
  updateOrderSchema,
  itemSchema,
  createItemSchema,
  updateItemSchema,
  
  // Design & Projects
  designerSchema,
  createDesignerSchema,
  updateDesignerSchema,
  designProjectSchema,
  createDesignProjectSchema,
  updateDesignProjectSchema,
  
  // Documents & Files
  documentSchema,
  uploadDocumentSchema,
  fileUploadSchema,
  
  // Workflows
  workflowSchema,
  createWorkflowSchema,
  updateWorkflowSchema,
  
  // API & Search
  paginationSchema,
  searchSchema,
  idParamsSchema,
  reportParamsSchema,
  
  // Batch Operations
  batchDeleteSchema,
  batchUpdateStatusSchema,
  
  // Notifications & Settings
  notificationSchema,
  createNotificationSchema,
  userSettingsSchema,
  companySettingsSchema
}