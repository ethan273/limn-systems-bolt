'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Package, 
  Bell, 
  MessageCircle, 
  Truck, 
  CheckCircle, 
  CreditCard,
  Search,
  Plus,
  Archive,
  Users,
  AlertTriangle
} from 'lucide-react';
import { AnimatedButton } from '../animated';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="mb-6 text-gray-400"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3, type: 'spring', stiffness: 200 }}
      >
        {icon}
      </motion.div>
      
      <motion.h3
        className="text-lg font-semibold text-gray-900 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        {title}
      </motion.h3>
      
      <motion.p
        className="text-gray-600 mb-6 max-w-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        {description}
      </motion.p>
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <AnimatedButton
            onClick={action.onClick}
            variant={action.variant || 'primary'}
            className="inline-flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>{action.label}</span>
          </AnimatedButton>
        </motion.div>
      )}
    </motion.div>
  );
}

// Specific empty states for different portal sections
export function NoOrdersEmpty({ onCreateOrder }: { onCreateOrder?: () => void }) {
  return (
    <EmptyState
      icon={<Package className="h-16 w-16" />}
      title="No orders yet"
      description="You haven't placed any orders yet. Start by creating your first order to begin tracking your projects with Limn Systems."
      action={onCreateOrder ? {
        label: "Create First Order",
        onClick: onCreateOrder,
        variant: 'primary'
      } : undefined}
    />
  );
}

export function NoNotificationsEmpty() {
  return (
    <EmptyState
      icon={<Bell className="h-16 w-16" />}
      title="All caught up!"
      description="You have no new notifications. We'll notify you when there are updates on your orders, approvals, or important messages."
      className="bg-gradient-to-br from-green-50 to-blue-50"
    />
  );
}

export function NoMessagesEmpty({ onSendMessage }: { onSendMessage?: () => void }) {
  return (
    <EmptyState
      icon={<MessageCircle className="h-16 w-16" />}
      title="No messages"
      description="Your message inbox is empty. Start a conversation with our team to get help with your projects or ask questions."
      action={onSendMessage ? {
        label: "Send Message",
        onClick: onSendMessage,
        variant: 'primary'
      } : undefined}
    />
  );
}

export function NoDocumentsEmpty({ onUpload }: { onUpload?: () => void }) {
  return (
    <EmptyState
      icon={<FileText className="h-16 w-16" />}
      title="No documents"
      description="Your document library is empty. Upload project files, specifications, or other important documents to get started."
      action={onUpload ? {
        label: "Upload Document",
        onClick: onUpload,
        variant: 'primary'
      } : undefined}
    />
  );
}

export function NoShipmentsEmpty() {
  return (
    <EmptyState
      icon={<Truck className="h-16 w-16" />}
      title="No shipments"
      description="No shipments to track at the moment. Once your orders are ready for delivery, you'll see tracking information here."
    />
  );
}

export function NoApprovalsEmpty() {
  return (
    <EmptyState
      icon={<CheckCircle className="h-16 w-16" />}
      title="No pending approvals"
      description="You're all set! There are no design approvals waiting for your review. New designs will appear here when they're ready."
      className="bg-gradient-to-br from-green-50 to-emerald-50"
    />
  );
}

export function NoPaymentsEmpty() {
  return (
    <EmptyState
      icon={<CreditCard className="h-16 w-16" />}
      title="No payment history"
      description="Your payment history is empty. Once you make payments for orders, they'll be tracked and displayed here."
    />
  );
}

export function NoInvoicesEmpty() {
  return (
    <EmptyState
      icon={<FileText className="h-16 w-16" />}
      title="No invoices"
      description="You don't have any invoices yet. Invoices will be generated automatically when you place orders or request services."
    />
  );
}

export function NoSearchResultsEmpty({ 
  searchTerm,
  onClearSearch 
}: { 
  searchTerm: string;
  onClearSearch?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-16 w-16" />}
      title={`No results for "${searchTerm}"`}
      description="We couldn't find anything matching your search. Try adjusting your search terms or browse all items."
      action={onClearSearch ? {
        label: "Clear Search",
        onClick: onClearSearch,
        variant: 'secondary'
      } : undefined}
    />
  );
}

export function NoProductionUpdatesEmpty() {
  return (
    <EmptyState
      icon={<Package className="h-16 w-16" />}
      title="No production updates"
      description="Production tracking information will appear here once your orders enter the manufacturing stage."
    />
  );
}

export function NoActivityEmpty() {
  return (
    <EmptyState
      icon={<Archive className="h-16 w-16" />}
      title="No recent activity"
      description="Your activity feed is empty. Recent actions, updates, and notifications will be displayed here."
    />
  );
}

export function ErrorStateEmpty({ 
  title = "Something went wrong",
  description = "We encountered an error while loading this content. Please try again.",
  onRetry
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-16 w-16 text-red-400" />}
      title={title}
      description={description}
      action={onRetry ? {
        label: "Try Again",
        onClick: onRetry,
        variant: 'secondary'
      } : undefined}
      className="bg-gradient-to-br from-red-50 to-orange-50"
    />
  );
}

export function OfflineEmpty({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-16 w-16 text-yellow-400" />}
      title="You're offline"
      description="Please check your internet connection and try again. Some features may not be available while offline."
      action={onRefresh ? {
        label: "Refresh",
        onClick: onRefresh,
        variant: 'secondary'
      } : undefined}
      className="bg-gradient-to-br from-yellow-50 to-amber-50"
    />
  );
}

export function LoadingEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <motion.div
        className="mb-4"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <div className="h-8 w-8 border-2 border-gray-300 border-t-blue-600 rounded-full" />
      </motion.div>
      <p className="text-gray-600">Loading...</p>
    </div>
  );
}

// Maintenance state
export function MaintenanceEmpty() {
  return (
    <EmptyState
      icon={<AlertTriangle className="h-16 w-16 text-blue-400" />}
      title="Under maintenance"
      description="We're performing scheduled maintenance to improve your experience. Please check back in a few minutes."
      className="bg-gradient-to-br from-blue-50 to-indigo-50"
    />
  );
}

// Coming soon state
export function ComingSoonEmpty({ feature }: { feature: string }) {
  return (
    <EmptyState
      icon={<Package className="h-16 w-16 text-purple-400" />}
      title="Coming soon"
      description={`${feature} is currently in development. We're working hard to bring you this feature soon!`}
      className="bg-gradient-to-br from-purple-50 to-pink-50"
    />
  );
}

// Permission denied state
export function PermissionDeniedEmpty({ 
  onContactSupport 
}: { 
  onContactSupport?: () => void;
}) {
  return (
    <EmptyState
      icon={<Users className="h-16 w-16 text-orange-400" />}
      title="Access restricted"
      description="You don't have permission to view this content. Contact your account administrator or our support team for assistance."
      action={onContactSupport ? {
        label: "Contact Support",
        onClick: onContactSupport,
        variant: 'secondary'
      } : undefined}
      className="bg-gradient-to-br from-orange-50 to-yellow-50"
    />
  );
}

// Generic empty state with custom content
export function CustomEmpty({ 
  children,
  className 
}: { 
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

export default EmptyState;