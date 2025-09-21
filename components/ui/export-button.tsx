'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Code, 
  Settings,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { exportService, ExportOptions, ExportFormat, ExportType } from '@/lib/services/export.service'

interface ExportButtonProps {
  data: Record<string, unknown>[]
  type: ExportType
  title?: string
  defaultColumns?: string[]
  className?: string
  disabled?: boolean
  onExportStart?: () => void
  onExportComplete?: (result: { url: string; filename: string }) => void
  onExportError?: (error: string) => void
}

const formatIcons: Record<ExportFormat, React.ReactNode> = {
  csv: <FileText className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  json: <Code className="h-4 w-4" />,
  xml: <Code className="h-4 w-4" />
}

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV File',
  pdf: 'PDF Document',
  excel: 'Excel Spreadsheet',
  json: 'JSON Data',
  xml: 'XML Data'
}

export function ExportButton({ 
  data, 
  type, 
  title,
  defaultColumns,
  className = '',
  disabled = false,
  onExportStart,
  onExportComplete,
  onExportError
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [lastExportMessage, setLastExportMessage] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(defaultColumns || [])
  const [customFilename, setCustomFilename] = useState('')

  const availableColumns = data.length > 0 ? Object.keys(data[0]) : []

  const handleQuickExport = async (format: ExportFormat) => {
    if (data.length === 0) {
      setExportStatus('error')
      setLastExportMessage('No data to export')
      onExportError?.('No data to export')
      return
    }

    setIsExporting(true)
    setExportStatus('idle')
    onExportStart?.()

    try {
      const options: ExportOptions = {
        format,
        type,
        data,
        title,
        columns: selectedColumns.length > 0 ? selectedColumns : undefined,
        filename: customFilename || undefined
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
        setLastExportMessage(`Successfully exported ${data.length} records`)
        onExportComplete?.({ url: result.downloadUrl || '', filename: result.filename })

        // Clean up URL after download
        setTimeout(() => {
          URL.revokeObjectURL(result.downloadUrl!)
        }, 1000)
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

  const handleColumnToggle = (column: string, checked: boolean) => {
    if (checked) {
      setSelectedColumns(prev => [...prev, column])
    } else {
      setSelectedColumns(prev => prev.filter(col => col !== column))
    }
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
    return 'Export'
  }

  const getButtonVariant = () => {
    if (exportStatus === 'success') return 'default'
    if (exportStatus === 'error') return 'outline'
    return 'outline'
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={className}
            disabled={disabled || isExporting || data.length === 0}
          >
            {getStatusIcon()}
            {getButtonText()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Quick Export</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(formatIcons).map(([format, icon]) => (
            <DropdownMenuItem
              key={format}
              onClick={() => handleQuickExport(format as ExportFormat)}
              disabled={isExporting}
            >
              {icon}
              <span className="ml-2">{formatLabels[format as ExportFormat]}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e: Event) => e.preventDefault()}>
                <Settings className="h-4 w-4" />
                <span className="ml-2">Advanced Options</span>
              </DropdownMenuItem>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Export Configuration</DialogTitle>
                <DialogDescription>
                  Customize your export with advanced options
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="filename">Custom Filename (optional)</Label>
                  <Input
                    id="filename"
                    placeholder="my-export"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Leave empty for auto-generated filename
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Select Columns to Export</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedColumns.length === availableColumns.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedColumns(availableColumns)
                          } else {
                            setSelectedColumns([])
                          }
                        }}
                      />
                      <Label htmlFor="select-all" className="font-medium">
                        Select All
                      </Label>
                    </div>
                    <div className="border-t pt-2 space-y-2">
                      {availableColumns.map((column) => (
                        <div key={column} className="flex items-center space-x-2">
                          <Checkbox
                            id={column}
                            checked={selectedColumns.includes(column)}
                            onCheckedChange={(checked) => 
                              handleColumnToggle(column, checked as boolean)
                            }
                          />
                          <Label htmlFor={column} className="text-sm font-mono">
                            {column}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {selectedColumns.length === 0 
                      ? 'All columns will be exported' 
                      : `${selectedColumns.length} columns selected`
                    }
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  {Object.entries(formatLabels).map(([format, label]) => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleQuickExport(format as ExportFormat)
                        setShowAdvanced(false)
                      }}
                      disabled={isExporting}
                      className="flex items-center gap-2"
                    >
                      {formatIcons[format as ExportFormat]}
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </DropdownMenuContent>
      </DropdownMenu>

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

// Simplified version for basic exports
export function SimpleExportButton({
  data,
  type,
  format = 'csv',
  title,
  className = '',
  disabled = false,
  children
}: {
  data: Record<string, unknown>[]
  type: ExportType
  format?: ExportFormat
  title?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) return

    setIsExporting(true)
    try {
      const options: ExportOptions = { format, type, data, title }
      const result = await exportService.export(options)

      if (result.success && result.downloadUrl) {
        const link = document.createElement('a')
        link.href = result.downloadUrl
        link.download = result.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(result.downloadUrl)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || data.length === 0}
      variant="outline"
      size="sm"
      className={className}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {children || `Export ${formatLabels[format]}`}
    </Button>
  )
}