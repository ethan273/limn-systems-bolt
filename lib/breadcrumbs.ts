import { BreadcrumbItem } from '@/components/ui/breadcrumb'

// Centralized breadcrumb configuration for all dashboard pages
export interface BreadcrumbConfig {
  [path: string]: BreadcrumbItem[]
}

export const breadcrumbConfig: BreadcrumbConfig = {
  // Main dashboard sections
  '/dashboard': [],
  '/dashboard/analytics': [{ label: 'Analytics' }],
  '/dashboard/settings': [{ label: 'Settings' }],
  '/dashboard/reports': [{ label: 'Reports' }],
  '/dashboard/activity': [{ label: 'Activity' }],

  // Customer management
  '/dashboard/customers': [{ label: 'Customers' }],
  '/dashboard/customers/analytics': [
    { label: 'Customers', href: '/dashboard/customers' },
    { label: 'Analytics' }
  ],
  '/dashboard/customers/retention': [
    { label: 'Customers', href: '/dashboard/customers' },
    { label: 'Retention' }
  ],
  '/dashboard/customers/portal-access': [
    { label: 'Customers', href: '/dashboard/customers' },
    { label: 'Portal Access' }
  ],
  '/dashboard/clients': [{ label: 'Clients' }],
  '/dashboard/contacts': [{ label: 'Contacts' }],
  '/dashboard/leads': [{ label: 'Leads' }],
  '/dashboard/crm': [{ label: 'CRM' }],

  // Sales & Revenue
  '/dashboard/orders': [{ label: 'Orders' }],
  '/dashboard/orders/create': [
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Create Order' }
  ],
  '/dashboard/invoices': [{ label: 'Invoices' }],
  '/dashboard/contracts': [{ label: 'Contracts' }],
  '/dashboard/pipeline': [{ label: 'Pipeline' }],

  // Financial management - Business critical pages
  '/dashboard/payments': [{ label: 'Payments' }],
  '/dashboard/ar-aging': [{ label: 'AR Aging' }],
  '/dashboard/finance': [{ label: 'Finance' }],
  '/dashboard/budgets': [{ label: 'Budgets' }],
  '/dashboard/budget-variance': [{ label: 'Budget Variance' }],
  '/dashboard/collections': [{ label: 'Collections' }],

  // Product & Inventory
  '/dashboard/products': [{ label: 'Products' }],
  '/dashboard/items': [{ label: 'Items' }],
  '/dashboard/materials': [{ label: 'Materials' }],

  // Design & Engineering
  '/dashboard/design-projects': [{ label: 'Design Projects' }],
  '/dashboard/design-briefs': [{ label: 'Design Briefs' }],
  '/dashboard/design-tracker': [{ label: 'Design Tracker' }],
  '/dashboard/design-team': [{ label: 'Design Team' }],
  '/dashboard/designers': [{ label: 'Designers' }],
  '/dashboard/prototypes': [{ label: 'Prototypes' }],

  // Manufacturing & Production
  '/dashboard/production': [{ label: 'Production' }],
  '/dashboard/production/analytics': [
    { label: 'Production', href: '/dashboard/production' },
    { label: 'Analytics' }
  ],
  '/dashboard/production/capacity': [
    { label: 'Production', href: '/dashboard/production' },
    { label: 'Capacity' }
  ],
  '/dashboard/production-team': [{ label: 'Production Team' }],
  '/dashboard/production-tracking': [{ label: 'Production Tracking' }],
  '/dashboard/manufacturers': [{ label: 'Manufacturers' }],
  '/dashboard/manufacturers/projects': [
    { label: 'Manufacturers', href: '/dashboard/manufacturers' },
    { label: 'Projects' }
  ],
  '/dashboard/manufacturers/shop-drawings': [
    { label: 'Manufacturers', href: '/dashboard/manufacturers' },
    { label: 'Shop Drawings' }
  ],
  
  // Manufacturing workflow - Business critical page
  '/dashboard/shop-drawings': [{ label: 'Shop Drawings' }],
  '/dashboard/qc-tracking': [{ label: 'QC Tracking' }],

  // Shipping & Logistics - Business critical page
  '/dashboard/shipping': [{ label: 'Shipping' }],
  '/dashboard/shipping-quotes': [{ label: 'Shipping Quotes' }],
  '/dashboard/shipping-management': [{ label: 'Shipping Management' }],
  '/dashboard/order-tracking': [{ label: 'Order Tracking' }],
  '/dashboard/packing': [{ label: 'Packing' }],

  // Team & Task management
  '/dashboard/tasks': [{ label: 'Tasks' }],
  '/dashboard/tasks-simple': [{ label: 'Simple Tasks' }],
  '/dashboard/my-tasks': [{ label: 'My Tasks' }],
  '/dashboard/sales-team': [{ label: 'Sales Team' }],
  '/dashboard/workflows': [{ label: 'Workflows' }],
  '/dashboard/workflows/builder': [
    { label: 'Workflows', href: '/dashboard/workflows' },
    { label: 'Builder' }
  ],

  // Projects
  '/dashboard/projects': [{ label: 'Projects' }],

  // Documents & Integrations
  '/dashboard/documents': [{ label: 'Documents' }],
  '/dashboard/pandadoc': [{ label: 'PandaDoc' }],
  '/dashboard/settings/pandadoc': [
    { label: 'Settings', href: '/dashboard/settings' },
    { label: 'PandaDoc' }
  ],

  // Admin & Development
  '/dashboard/admin/phase3-deployment': [
    { label: 'Admin' },
    { label: 'Phase 3 Deployment' }
  ],
  '/dashboard/db-analysis': [{ label: 'Database Analysis' }],
  '/dashboard/migration-status': [{ label: 'Migration Status' }],
  '/dashboard/seed-test-data': [{ label: 'Seed Test Data' }],
  '/dashboard/test-enhancements': [{ label: 'Test Enhancements' }],
  '/dashboard/debug': [{ label: 'Debug' }],
}

// Dynamic breadcrumb generators for parameterized routes
export function generateDynamicBreadcrumbs(pathname: string, params: Record<string, string> = {}): BreadcrumbItem[] {
  // Handle parameterized routes
  if (pathname.includes('/dashboard/clients/') && pathname.includes('/edit')) {
    return [
      { label: 'Clients', href: '/dashboard/clients' },
      { label: `Client ${params.id || 'Details'}`, href: `/dashboard/clients/${params.id}` },
      { label: 'Edit' }
    ]
  }

  if (pathname.includes('/dashboard/leads/') && pathname.includes('/edit')) {
    return [
      { label: 'Leads', href: '/dashboard/leads' },
      { label: `Lead ${params.id || 'Details'}`, href: `/dashboard/leads/${params.id}` },
      { label: 'Edit' }
    ]
  }

  if (pathname.includes('/dashboard/contacts/') && pathname.includes('/edit')) {
    return [
      { label: 'Contacts', href: '/dashboard/contacts' },
      { label: `Contact ${params.id || 'Details'}`, href: `/dashboard/contacts/${params.id}` },
      { label: 'Edit' }
    ]
  }

  if (pathname.includes('/dashboard/orders/') && pathname.includes('/edit')) {
    return [
      { label: 'Orders', href: '/dashboard/orders' },
      { label: `Order ${params.id || 'Details'}`, href: `/dashboard/orders/${params.id}` },
      { label: 'Edit' }
    ]
  }

  if (pathname.includes('/dashboard/projects/') && pathname.includes('/edit')) {
    return [
      { label: 'Projects', href: '/dashboard/projects' },
      { label: `Project ${params.id || 'Details'}`, href: `/dashboard/projects/${params.id}` },
      { label: 'Edit' }
    ]
  }

  if (pathname.includes('/dashboard/projects/') && pathname.includes('/overview')) {
    return [
      { label: 'Projects', href: '/dashboard/projects' },
      { label: `Project ${params.id || 'Details'}`, href: `/dashboard/projects/${params.id}` },
      { label: 'Overview' }
    ]
  }

  if (pathname.includes('/dashboard/budgets/') && !pathname.includes('/edit')) {
    return [
      { label: 'Budgets', href: '/dashboard/budgets' },
      { label: `Budget ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/products/')) {
    return [
      { label: 'Products', href: '/dashboard/products' },
      { label: `Product ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/items/')) {
    return [
      { label: 'Items', href: '/dashboard/items' },
      { label: `Item ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/manufacturers/') && !pathname.includes('/projects')) {
    return [
      { label: 'Manufacturers', href: '/dashboard/manufacturers' },
      { label: `Manufacturer ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/manufacturers/projects/') && pathname.includes('/materials')) {
    return [
      { label: 'Manufacturers', href: '/dashboard/manufacturers' },
      { label: 'Projects', href: '/dashboard/manufacturers/projects' },
      { label: `Project ${params.id || 'Details'}`, href: `/dashboard/manufacturers/projects/${params.id}` },
      { label: 'Materials' }
    ]
  }

  if (pathname.includes('/dashboard/manufacturers/projects/') && pathname.includes('/milestones')) {
    return [
      { label: 'Manufacturers', href: '/dashboard/manufacturers' },
      { label: 'Projects', href: '/dashboard/manufacturers/projects' },
      { label: `Project ${params.id || 'Details'}`, href: `/dashboard/manufacturers/projects/${params.id}` },
      { label: 'Milestones' }
    ]
  }

  if (pathname.includes('/dashboard/design-projects/')) {
    return [
      { label: 'Design Projects', href: '/dashboard/design-projects' },
      { label: `Project ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/designers/')) {
    return [
      { label: 'Designers', href: '/dashboard/designers' },
      { label: `Designer ${params.id || 'Details'}` }
    ]
  }

  if (pathname.includes('/dashboard/workflows/') && pathname.includes('/logs')) {
    return [
      { label: 'Workflows', href: '/dashboard/workflows' },
      { label: `Workflow ${params.id || 'Details'}`, href: `/dashboard/workflows/${params.id}` },
      { label: 'Logs' }
    ]
  }

  // Return static breadcrumb if available
  return breadcrumbConfig[pathname] || []
}

// Helper to get breadcrumbs for any route
export function getBreadcrumbs(pathname: string, params: Record<string, string> = {}): BreadcrumbItem[] {
  // Try static configuration first
  if (breadcrumbConfig[pathname]) {
    return breadcrumbConfig[pathname]
  }
  
  // Fall back to dynamic generation
  return generateDynamicBreadcrumbs(pathname, params)
}