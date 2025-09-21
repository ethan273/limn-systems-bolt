/**
 * Dashboard UI Standards Utility
 * Provides consistent styling patterns and sample data for dashboard pages
 */

// Standard Typography Classes
export const TYPOGRAPHY_STANDARDS = {
  pageTitle: 'text-4xl font-bold text-slate-900',
  pageDescription: 'text-slate-600 text-lg mt-2',
  sectionTitle: 'text-2xl font-semibold text-slate-900',
  cardTitle: 'text-lg font-semibold text-slate-900',
  primaryText: 'text-slate-900',
  secondaryText: 'text-slate-600',
  metaText: 'text-slate-500 text-sm',
  // Avoid these weak colors: text-gray-400, text-gray-300, text-gray-500
}

// Standard Color Classes for Status/Priority
export const STATUS_COLORS = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-slate-100 text-slate-800',
}

export const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-blue-100 text-blue-800',
  normal: 'bg-blue-100 text-blue-800',
  low: 'bg-slate-100 text-slate-800',
}

// Note: All sample data generators have been removed as per project requirements.
// This system only uses real data from the database.

// Standard Error Messages
export const ERROR_MESSAGES = {
  noData: 'No data available.',
  loadFailed: 'Failed to load data. Please check your connection and try again.',
  unauthorized: 'You do not have permission to view this data.',
  serverError: 'Server error occurred. Please try again later.'
}

// Helper function to format currency
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

// Helper function to format date
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Helper function to get status color
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
    case 'shipped':
    case 'active':
    case 'approved':
      return STATUS_COLORS.success
    case 'pending':
    case 'in_progress':
    case 'processing':
    case 'review':
      return STATUS_COLORS.info
    case 'urgent':
    case 'overdue':
    case 'low_stock':
      return STATUS_COLORS.warning
    case 'cancelled':
    case 'failed':
    case 'rejected':
      return STATUS_COLORS.error
    default:
      return STATUS_COLORS.default
  }
}