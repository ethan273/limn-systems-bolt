'use client';

import { lazy, Suspense, ComponentType, useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ErrorBoundary } from '../error-boundary';

// Lazy-loaded portal components
export const LazyProductionTracker = lazy(() => 
  import('../production-tracker').then(m => ({ default: m.ProductionTracker }))
);

export const LazyFinancialDashboard = lazy(() => 
  import('../financial-summary').then(m => ({ default: m.FinancialSummary }))
);

export const LazyDocumentLibrary = lazy(() => 
  import('../document-library').then(m => ({ default: m.DocumentLibrary }))
);

export const LazyNotificationCenter = lazy(() => 
  import('../notification-center').then(m => ({ default: m.NotificationCenter }))
);

export const LazyMessageCenter = lazy(() => 
  import('../message-center').then(m => ({ default: m.MessageCenter }))
);

export const LazyShipmentTracker = lazy(() => 
  import('../shipment-tracker').then(m => ({ default: m.ShipmentTracker }))
);

export const LazyDesignApprovalCard = lazy(() => 
  import('../design-approval-card').then(m => ({ default: m.DesignApprovalCard }))
);

export const LazyInvoiceList = lazy(() => 
  import('../invoice-list').then(m => ({ default: m.InvoiceList }))
);

export const LazyPaymentHistory = lazy(() => 
  import('../payment-history').then(m => ({ default: m.PaymentHistory }))
);

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode,
  errorFallback?: React.ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback || <ComponentSkeleton />}>
        <Component {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Default skeleton component for lazy loading
function ComponentSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="flex space-x-4">
          <div className="h-10 bg-gray-200 rounded w-20"></div>
          <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}

// Lazy loading hook with intersection observer
export function useLazyLoad() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
    rootMargin: '100px 0px',
  });

  useEffect(() => {
    if (inView) {
      setShouldLoad(true);
    }
  }, [inView]);

  return { ref, shouldLoad };
}