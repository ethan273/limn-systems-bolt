'use client'

import React, { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { safeGet } from '@/lib/utils/bulk-type-fixes'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Code,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  Save,
  Clock,
  Zap
} from 'lucide-react'
import { 
  exportService, 
  ExportOptions, 
  ExportFormat, 
  ExportType 
} from '@/lib/services/export.service'

// Enhanced export configuration interface
interface ExportConfig {
  name?: string
  format: ExportFormat
  columns: string[]
  filters: Record<string, unknown>
  dateRange?: {
    start?: string
    end?: string
  }
  maxRows?: number
  includeMetadata: boolean
  customFilename?: string
  template?: string
  compression?: boolean
}

interface EnhancedExportProps {
  data: Record<string, unknown>[]
  type: ExportType
  title?: string
  columns?: Array<{
    key: string
    label: string
    type?: 'text' | 'number' | 'date' | 'boolean' | 'currency'
  }>
  filters?: Record<string, unknown>
  onExportComplete?: (result: { url: string; filename: string }) => void
  onExportError?: (error: string) => void
  className?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'button' | 'card' | 'inline'
}

const formatConfig = {
  csv: {
    label: 'CSV File',
    icon: FileText,
    description: 'Comma-separated values for spreadsheet applications',
    maxRows: 100000,
    features: ['filters', 'columns', 'metadata']
  },
  excel: {
    label: 'Excel Spreadsheet',
    icon: FileSpreadsheet,
    description: 'Full-featured Excel workbook with formatting',
    maxRows: 50000,
    features: ['filters', 'columns', 'metadata', 'formatting', 'charts']
  },
  pdf: {
    label: 'PDF Document',
    icon: FileText,
    description: 'Formatted document for printing and sharing',
    maxRows: 1000,
    features: ['filters', 'columns', 'formatting', 'charts']
  },
  json: {
    label: 'JSON Data',
    icon: Code,
    description: 'Machine-readable data format',
    maxRows: 50000,
    features: ['filters', 'metadata']
  },
  xml: {
    label: 'XML Data',
    icon: Code,
    description: 'Structured markup format',
    maxRows: 25000,
    features: ['filters', 'metadata']
  }
}

export function EnhancedExport({
  data,
  type,
  title,
  columns = [],
  onExportComplete,
  onExportError,
  className = '',
  disabled = false,
  size = 'sm',
  variant = 'button'
}: EnhancedExportProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [lastExportMessage, setLastExportMessage] = useState('')
  const [currentTab, setCurrentTab] = useState('quick')
  
  // Export configuration state
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    columns: columns.map(c => c.key),
    filters: {},
    maxRows: 10000,
    includeMetadata: true,
    compression: false
  })

  // Saved configurations
  const [savedConfigs, setSavedConfigs] = useState<ExportConfig[]>([])
  const [exportHistory, setExportHistory] = useState<Array<{ id: string; filename: string; timestamp: string; status: string }>>([])

  // Load saved configurations and history
  React.useEffect(() => {
    loadSavedConfigs()
    loadExportHistory()
  }, [])

  const loadSavedConfigs = async () => {
    const { data } = await exportService.getExportConfigurations()
    setSavedConfigs(data || [])
  }

  const loadExportHistory = async () => {
    const { data } = await exportService.getExportHistory(10)
    setExportHistory(data || [])
  }

  // Calculate export statistics
  const exportStats = useMemo(() => {
    const selectedData = data.slice(0, config.maxRows)
    const selectedColumns = (config.columns || []).length || columns.length
    const estimatedSize = selectedData.length * selectedColumns * 20 // rough estimate
    
    return {
      totalRows: data.length,
      selectedRows: selectedData.length,
      totalColumns: columns.length,
      selectedColumns,
      estimatedSize: formatBytes(estimatedSize),
      estimatedTime: Math.max(1, Math.ceil(selectedData.length / 1000)) // seconds
    }
  }, [data, config, columns])

  const handleQuickExport = async (format: ExportFormat) => {
    await handleExport({ ...config, format })
  }

  const handleExport = async (exportConfig: ExportConfig) => {
    if (data.length === 0) {
      setExportStatus('error')
      setLastExportMessage('No data to export')
      onExportError?.('No data to export')
      return
    }

    setIsExporting(true)
    setExportStatus('idle')

    try {
      const options: ExportOptions = {
        format: exportConfig.format,
        type,
        data: data.slice(0, exportConfig.maxRows),
        columns: (exportConfig.columns || []).length > 0 ? exportConfig.columns : undefined,
        filters: exportConfig.filters,
        filename: exportConfig.customFilename,
        title,
        metadata: exportConfig.includeMetadata ? {
          exportedAt: new Date().toISOString(),
          totalRows: data.length,
          selectedRows: Math.min(data.length, exportConfig.maxRows || data.length),
          selectedColumns: (exportConfig.columns || []).length || columns.length,
          filters: Object.keys(exportConfig.filters).length > 0 ? exportConfig.filters : undefined
        } : undefined
      }

      const result = await exportService.export(options)

      if (result.success && result.downloadUrl) {
        // Trigger download
        const link = document.createElement('a')
        link.href = result.downloadUrl
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        setExportStatus('success')
        setLastExportMessage(`Successfully exported ${exportStats.selectedRows} records`)
        onExportComplete?.({ url: result.downloadUrl || '', filename: result.filename })

        // Clean up URL after download
        setTimeout(() => {
          URL.revokeObjectURL(result.downloadUrl!)
        }, 1000)

        // Refresh history
        loadExportHistory()
      } else {
        throw new Error(result.error || 'Export failed')
      }
    } catch (error) {
      setExportStatus('error')
      const errorMessage = error instanceof Error ? error.message : 'Export failed'
      setLastExportMessage(errorMessage)
      onExportError?.(errorMessage)
    } finally {
      setIsExporting(false)
      
      // Reset status after 3 seconds
      setTimeout(() => {
        setExportStatus('idle')
        setLastExportMessage('')
      }, 3000)
    }
  }

  const handleSaveConfiguration = async () => {
    if (!config.name) return

    try {
      await exportService.saveExportConfiguration({
        name: config.name,
        export_type: type,
        format: config.format,
        columns: config.columns,
        filters: config.filters
      })
      
      loadSavedConfigs()
      setLastExportMessage('Configuration saved successfully')
    } catch {
      setLastExportMessage('Failed to save configuration')
    }
  }

  const handleLoadConfiguration = (savedConfig: ExportConfig) => {
    setConfig({
      ...config,
      format: savedConfig.format,
      columns: savedConfig.columns || [],
      filters: savedConfig.filters || {}
    })
  }

  const handleColumnToggle = (columnKey: string, checked: boolean) => {
    setConfig(prev => ({
      ...prev,
      columns: checked 
        ? [...prev.columns, columnKey]
        : (prev.columns || []).filter(c => c !== columnKey)
    }))
  }

  const getStatusIcon = () => {
    if (isExporting) return <Loader2 className="h-4 w-4 animate-spin" />
    if (exportStatus === 'success') return <CheckCircle className="h-4 w-4 text-green-600" />
    if (exportStatus === 'error') return <AlertCircle className="h-4 w-4 text-red-600" />
    return <Download className="h-4 w-4" />
  }

  const getButtonText = () => {
    if (isExporting) return 'Exporting...'
    if (exportStatus === 'success') return 'Exported!'
    if (exportStatus === 'error') return 'Export Failed'
    return 'Export Data'
  }

  const renderQuickActions = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.entries(formatConfig).map(([format, formatInfo]) => {
        const IconComponent = formatInfo.icon
        return (
          <Card 
            key={format}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleQuickExport(format as ExportFormat)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <IconComponent className="h-5 w-5" />
                <CardTitle className="text-sm">{formatInfo.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-2">
                {formatInfo.description}
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  Max {formatInfo.maxRows.toLocaleString()} rows
                </Badge>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  const renderAdvancedOptions = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label>Export Format</Label>
        <Select value={config.format} onValueChange={(value: ExportFormat) => 
          setConfig(prev => ({ ...prev, format: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(formatConfig).map(([format, formatInfo]) => (
              <SelectItem key={format} value={format}>
                <div className="flex items-center gap-2">
                  <formatInfo.icon className="h-4 w-4" />
                  {formatInfo.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Row Limit */}
      <div className="space-y-3">
        <Label>Row Limit</Label>
        <div className="space-y-2">
          <Slider
            value={[config.maxRows || 10000]}
            onValueChange={(value) => setConfig(prev => ({ ...prev, maxRows: value[0] }))}
            max={formatConfig[config.format].maxRows}
            min={100}
            step={100}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100</span>
            <span>{config.maxRows?.toLocaleString()} rows</span>
            <span>{formatConfig[config.format].maxRows.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Column Selection */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Columns to Export</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfig(prev => ({ ...prev, columns: columns.map(c => c.key) }))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfig(prev => ({ ...prev, columns: [] }))}
            >
              Clear All
            </Button>
          </div>
        </div>
        
        <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
          {columns.map((column) => (
            <div key={column.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={column.key}
                  checked={(config.columns || "").includes(column.key)}
                  onCheckedChange={(checked) => 
                    handleColumnToggle(column.key, checked as boolean)
                  }
                />
                <Label htmlFor={column.key} className="text-sm">
                  {column.label}
                </Label>
              </div>
              {column.type && (
                <Badge variant="outline" className="text-xs">
                  {column.type}
                </Badge>
              )}
            </div>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground">
          {(config.columns || []).length === 0 
            ? 'All columns will be exported' 
            : `${(config.columns || []).length} of ${columns.length} columns selected`
          }
        </p>
      </div>

      {/* Additional Options */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Include Metadata</Label>
            <p className="text-xs text-muted-foreground">
              Add export date, row counts, and filter info
            </p>
          </div>
          <Switch
            checked={config.includeMetadata}
            onCheckedChange={(checked) => 
              setConfig(prev => ({ ...prev, includeMetadata: checked }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Custom Filename (optional)</Label>
          <Input
            placeholder="my-export"
            value={config.customFilename || ''}
            onChange={(e) => setConfig(prev => ({ 
              ...prev, 
              customFilename: e.target.value 
            }))}
          />
        </div>
      </div>
    </div>
  )

  const renderSavedConfigurations = () => (
    <div className="space-y-4">
      {/* Save Current Config */}
      <div className="space-y-2">
        <Label>Save Current Configuration</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Configuration name"
            value={config.name || ''}
            onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
          />
          <Button 
            onClick={handleSaveConfiguration}
            disabled={!config.name}
            size="sm"
          >
            <Save className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Saved Configurations */}
      <div className="space-y-2">
        <Label>Saved Configurations</Label>
        {savedConfigs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No saved configurations
          </p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {savedConfigs.map((savedConfig) => (
              <div 
                key={String(safeGet(savedConfig, ['id']) || safeGet(savedConfig, ['name']) || Math.random())}
                className="flex items-center justify-between p-2 border rounded hover:bg-gray-50"
              >
                <div>
                  <div className="text-sm font-medium">{savedConfig.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatConfig[savedConfig.format as ExportFormat]?.label} • 
                    {savedConfig.columns?.length || 0} columns
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLoadConfiguration(savedConfig)}
                >
                  Load
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderExportHistory = () => (
    <div className="space-y-2">
      <Label>Recent Exports</Label>
      {exportHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No export history
        </p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {exportHistory.map((historyItem) => (
            <div 
              key={historyItem.id}
              className="flex items-center justify-between p-2 border rounded"
            >
              <div>
                <div className="text-sm font-medium">{historyItem.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(String(safeGet(historyItem, ['created_at']) || safeGet(historyItem, ['timestamp']) || Date.now())).toLocaleString()} • 
                  {Number(safeGet(historyItem, ['record_count']) || 0)} records • 
                  {historyItem.status}
                </div>
              </div>
              <Badge variant={
                historyItem.status === 'completed' ? 'default' :
                historyItem.status === 'failed' ? 'destructive' : 'secondary'
              }>
                {historyItem.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderExportStats = () => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Export Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Rows:</span>
            <div className="font-medium">{exportStats.totalRows.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Selected Rows:</span>
            <div className="font-medium">{exportStats.selectedRows.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Columns:</span>
            <div className="font-medium">{exportStats.selectedColumns} of {exportStats.totalColumns}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Est. Size:</span>
            <div className="font-medium">{exportStats.estimatedSize}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          Estimated time: ~{exportStats.estimatedTime} seconds
        </div>
      </CardContent>
    </Card>
  )

  if (variant === 'button') {
    return (
      <div className="flex items-center gap-2">
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size={size}
              className={className}
              disabled={disabled || data.length === 0}
            >
              {getStatusIcon()}
              {getButtonText()}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Export Data</DialogTitle>
              <DialogDescription>
                Export {data.length.toLocaleString()} records from {title || type}
              </DialogDescription>
            </DialogHeader>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="quick" className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Quick
                </TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="quick" className="space-y-4">
                  {renderQuickActions()}
                  {renderExportStats()}
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      {renderAdvancedOptions()}
                    </div>
                    <div>
                      {renderExportStats()}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="saved">
                  {renderSavedConfigurations()}
                </TabsContent>

                <TabsContent value="history">
                  {renderExportHistory()}
                </TabsContent>
              </div>
            </Tabs>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
              >
                Cancel
              </Button>
              <Button 
                onClick={() => handleExport(config)}
                disabled={isExporting || data.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export {formatConfig[config.format].label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {lastExportMessage && (
          <span className={`text-sm ${
            exportStatus === 'success' 
              ? 'text-green-600' 
              : exportStatus === 'error' 
              ? 'text-red-600' 
              : 'text-muted-foreground'
          }`}>
            {lastExportMessage}
          </span>
        )}
      </div>
    )
  }

  return null // Other variants can be implemented as needed
}

// Utility function
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}