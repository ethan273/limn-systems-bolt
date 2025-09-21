import React from 'react'
import { Wrench, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface MaintenanceModeProps {
  title?: string
  message?: string
  estimatedDuration?: string
  contactInfo?: string
  showRefresh?: boolean
  customContent?: React.ReactNode
}

export function MaintenanceMode({
  title = "System Maintenance",
  message = "We're currently performing scheduled maintenance to improve our services. Please check back shortly.",
  estimatedDuration,
  contactInfo,
  showRefresh = true,
  customContent
}: MaintenanceModeProps) {
  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Wrench className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-xl text-gray-900">{title}</CardTitle>
          <CardDescription className="text-gray-600">
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {estimatedDuration && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Estimated duration: {estimatedDuration}</span>
            </div>
          )}

          {customContent}

          <div className="space-y-3 pt-4">
            {showRefresh && (
              <Button onClick={handleRefresh} variant="outline" className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
            
            {contactInfo && (
              <div className="text-xs text-gray-500">
                <AlertCircle className="inline w-3 h-3 mr-1" />
                Need help? Contact us at {contactInfo}
              </div>
            )}
          </div>

          <div className="pt-4 text-xs text-gray-400">
            We apologize for the inconvenience and appreciate your patience.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Specialized maintenance components for different scenarios
export function ScheduledMaintenance({ 
  startTime, 
  endTime 
}: { 
  startTime?: Date
  endTime?: Date 
}) {
  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const estimatedDuration = startTime && endTime ? 
    `${Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60))} minutes` : 
    undefined

  return (
    <MaintenanceMode
      title="Scheduled Maintenance"
      message="We're performing scheduled system maintenance to improve performance and add new features."
      estimatedDuration={estimatedDuration}
      customContent={
        <div className="space-y-2 text-sm text-gray-600">
          {startTime && (
            <div>
              <strong>Started:</strong> {formatTime(startTime)}
            </div>
          )}
          {endTime && (
            <div>
              <strong>Expected completion:</strong> {formatTime(endTime)}
            </div>
          )}
        </div>
      }
      contactInfo="support@limnsystems.com"
    />
  )
}

export function EmergencyMaintenance({ 
  issue, 
  priority = 'high' 
}: { 
  issue?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  return (
    <MaintenanceMode
      title="Emergency Maintenance"
      message={issue || "We're addressing an urgent issue to ensure system reliability. Service will be restored as quickly as possible."}
      customContent={
        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(priority)}`}>
          <AlertCircle className="w-3 h-3 mr-1" />
          {priority.toUpperCase()} PRIORITY
        </div>
      }
      contactInfo="support@limnsystems.com"
    />
  )
}

export function DatabaseMaintenance() {
  return (
    <MaintenanceMode
      title="Database Maintenance"
      message="We're performing essential database maintenance to improve performance and data integrity."
      estimatedDuration="30-45 minutes"
      customContent={
        <div className="text-sm text-gray-600 space-y-2">
          <div className="font-medium">What&apos;s happening:</div>
          <ul className="text-xs space-y-1 text-left list-disc list-inside">
            <li>Database optimization</li>
            <li>Index rebuilding</li>
            <li>Performance improvements</li>
            <li>Security updates</li>
          </ul>
        </div>
      }
      contactInfo="support@limnsystems.com"
    />
  )
}

// Hook for checking maintenance mode status
export function useMaintenanceMode() {
  const [isMaintenanceMode, setIsMaintenanceMode] = React.useState(false)
  const [maintenanceInfo, setMaintenanceInfo] = React.useState<{
    type?: string;
    startTime?: string;
    endTime?: string;
    issue?: string;
    priority?: string;
    title?: string;
    message?: string;
    estimatedDuration?: string;
    contactInfo?: string;
  } | null>(null)

  React.useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/maintenance')
        const data = await response.json()
        
        setIsMaintenanceMode(data.maintenanceMode || false)
        setMaintenanceInfo(data.maintenanceInfo || null)
      } catch (error) {
        console.warn('Failed to check maintenance mode:', error)
        // Default to not in maintenance mode if check fails
        setIsMaintenanceMode(false)
      }
    }

    checkMaintenanceMode()
    
    // Check periodically
    const interval = setInterval(checkMaintenanceMode, 30000) // Every 30 seconds
    
    return () => clearInterval(interval)
  }, [])

  return { isMaintenanceMode, maintenanceInfo }
}

// Component that automatically shows maintenance mode when enabled
export function MaintenanceModeProvider({ children }: { children: React.ReactNode }) {
  const { isMaintenanceMode, maintenanceInfo } = useMaintenanceMode()

  if (isMaintenanceMode) {
    const maintenanceType = maintenanceInfo?.type || 'general'
    
    switch (maintenanceType) {
      case 'scheduled':
        return (
          <ScheduledMaintenance 
            startTime={maintenanceInfo?.startTime ? new Date(maintenanceInfo.startTime) : undefined}
            endTime={maintenanceInfo?.endTime ? new Date(maintenanceInfo.endTime) : undefined}
          />
        )
      case 'emergency':
        return (
          <EmergencyMaintenance 
            issue={maintenanceInfo?.issue}
            priority={maintenanceInfo?.priority as "low" | "medium" | "high" | "critical" | undefined}
          />
        )
      case 'database':
        return <DatabaseMaintenance />
      default:
        return (
          <MaintenanceMode 
            title={maintenanceInfo?.title}
            message={maintenanceInfo?.message}
            estimatedDuration={maintenanceInfo?.estimatedDuration}
            contactInfo={maintenanceInfo?.contactInfo}
          />
        )
    }
  }

  return <>{children}</>
}