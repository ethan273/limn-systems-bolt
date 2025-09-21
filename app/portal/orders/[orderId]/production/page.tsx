'use client'

import { use } from 'react'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'
import { ArrowLeft, Download, RefreshCw, Package, Clock, CheckCircle2 } from 'lucide-react'
import { ProductionTracker } from '@/components/portal/production-tracker'
import { useProductionTracking } from '@/hooks/useProductionTracking'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BreadcrumbNav as Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { formatProductionTime } from '@/lib/production/calculations'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export default function ProductionTrackingPage({ params }: PageProps) {
  const { orderId } = use(params)
  const { data, loading, error, refetch } = useProductionTracking(orderId)

  const handleRefresh = () => {
    refetch()
  }

  const handleDownloadReport = async () => {
    try {
      // In a real implementation, this would generate a PDF report
      const response = await fetch(`/api/portal/production/${orderId}/report`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `production-report-${data?.orderNumber || orderId}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download report:', error)
      // For now, show a message that this feature is coming soon
      toast.info('Production report download will be available soon!')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="flex justify-between">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-12"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link href="/portal" className="text-[#91bdbd] hover:text-[#7da9a9]">
                Portal
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <Link href="/portal/orders" className="text-[#91bdbd] hover:text-[#7da9a9]">
                Orders
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <span className="text-gray-500">Production</span>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#4b4949] mb-2">
              Unable to Load Production Data
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-x-3">
              <Button 
                onClick={handleRefresh}
                className="bg-[#91bdbd] hover:bg-[#7da9a9] text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link href="/portal/orders">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#4b4949] mb-2">
              No Production Data Available
            </h3>
            <p className="text-gray-600 mb-4">
              Production tracking data is not available for this order.
            </p>
            <Link href="/portal/orders">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/portal" className="text-[#91bdbd] hover:text-[#7da9a9]">
              Portal
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href="/portal/orders" className="text-[#91bdbd] hover:text-[#7da9a9]">
              Orders
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <Link href={`/portal/orders/${orderId}`} className="text-[#91bdbd] hover:text-[#7da9a9]">
              {data.orderNumber}
            </Link>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span className="text-gray-500">Production</span>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header with Actions */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#4b4949] mb-2">
            Production Tracking
          </h1>
          <p className="text-gray-600">
            Real-time production status for Order {data.orderNumber}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleDownloadReport}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>

          <Link href="/portal/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Progress</p>
                <p className="text-2xl font-bold text-[#4b4949]">{data.overallProgress}%</p>
              </div>
              <div className="w-12 h-12 bg-[#91bdbd]/20 rounded-full flex items-center justify-center">
                <Package className="w-6 h-6 text-[#91bdbd]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Stage</p>
                <p className="text-lg font-semibold text-[#4b4949]">{data.currentStage}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Items in Production</p>
                <p className="text-2xl font-bold text-[#4b4949]">{(data.items || []).length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Est. Completion</p>
                <p className="text-sm font-semibold text-[#4b4949]">
                  {data.estimatedCompletion 
                    ? formatProductionTime(data.estimatedCompletion)
                    : 'TBD'
                  }
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Production Tracker */}
      <ProductionTracker orderId={orderId} />

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#4b4949]">Quick Actions</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href={`/portal/orders/${orderId}`}
              className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-[#91bdbd]" />
                <div>
                  <h4 className="font-medium text-[#4b4949]">Order Details</h4>
                  <p className="text-sm text-gray-600">View full order information</p>
                </div>
              </div>
            </Link>

            <button 
              onClick={handleDownloadReport}
              className="block w-full p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center space-x-3">
                <Download className="w-5 h-5 text-[#91bdbd]" />
                <div>
                  <h4 className="font-medium text-[#4b4949]">Production Report</h4>
                  <p className="text-sm text-gray-600">Download detailed progress report</p>
                </div>
              </div>
            </button>
          </div>

          {data.overallProgress < 100 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Production in Progress</h4>
                  <p className="text-sm text-blue-700">
                    Your order is currently in the <strong>{data.currentStage}</strong> stage. 
                    {data.estimatedCompletion && (
                      <span> Estimated completion: {formatProductionTime(data.estimatedCompletion)}.</span>
                    )}
                  </p>
                  {(data.items || []).filter(item => item.overallProgress < 100).length > 0 && (
                    <p className="text-sm text-blue-600 mt-1">
                      {(data.items || []).filter(item => item.overallProgress < 100).length} item(s) still in production.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {data.overallProgress === 100 && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Production Complete!</h4>
                  <p className="text-sm text-green-700">
                    All items in your order have completed production and are ready for shipping.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}