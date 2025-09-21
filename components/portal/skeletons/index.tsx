'use client';

import { cn } from '@/lib/utils';

// Base skeleton component with shimmer effect
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 relative overflow-hidden',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
        className
      )}
    />
  );
}

// Order card skeleton
export function OrderSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
    </div>
  );
}

// Production stage skeleton
export function ProductionStageSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="flex justify-between text-sm">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
      
      <div className="pt-2 border-t">
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}

// Notification skeleton
export function NotificationSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-4 border-b border-gray-100 last:border-0">
      <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="flex items-center space-x-2 pt-1">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-20 rounded" />
        </div>
      </div>
    </div>
  );
}

// Document card skeleton
export function DocumentCardSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start space-x-3">
        <Skeleton className="h-12 w-12 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-8 w-8 rounded" />
      </div>
      
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-6 w-18 rounded-full" />
      </div>
    </div>
  );
}

// Financial summary skeleton
export function FinancialSummarySkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-28 rounded" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Message thread skeleton
export function MessageThreadSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg space-y-2 ${
            i % 2 === 0 ? 'bg-gray-100' : 'bg-blue-100'
          }`}>
            <div className="flex items-center space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-3 w-12" />
              {i % 3 === 0 && <Skeleton className="h-4 w-4 rounded" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Shipment tracker skeleton
export function ShipmentTrackerSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4">
            <div className="flex flex-col items-center">
              <Skeleton className={`h-4 w-4 rounded-full ${i === 0 ? 'bg-blue-200' : 'bg-gray-200'}`} />
              {i < 3 && <Skeleton className="h-8 w-0.5 my-1" />}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-48" />
              {i === 0 && (
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3 w-24" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Table skeleton for lists
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex items-center space-x-8">
          {[...Array(columns)].map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100 last:border-0">
          <div className="flex items-center space-x-8">
            {[...Array(columns)].map((_, j) => (
              <Skeleton key={j} className={`h-4 ${j === 0 ? 'w-32' : j === 1 ? 'w-24' : 'w-20'}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard stats skeleton
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-3 w-3" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Generic list skeleton
export function ListSkeleton({ 
  items = 5, 
  showAvatar = false,
  showActions = false 
}: { 
  items?: number; 
  showAvatar?: boolean;
  showActions?: boolean;
}) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          {showActions && (
            <div className="flex space-x-2">
              <Skeleton className="h-8 w-16 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Page loading skeleton
export function PageLoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded" />
      </div>
      
      {/* Stats */}
      <DashboardStatsSkeleton />
      
      {/* Content sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <TableSkeleton rows={6} />
        </div>
        <div className="space-y-4">
          <ListSkeleton items={4} showAvatar showActions />
        </div>
      </div>
    </div>
  );
}