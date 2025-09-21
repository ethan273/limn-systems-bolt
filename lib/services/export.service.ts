import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as ExcelJS from 'exceljs'
import * as js2xmlparser from 'js2xmlparser'
import { createClient } from '@/lib/supabase/client'

export type ExportFormat = 'csv' | 'pdf' | 'excel' | 'json' | 'xml'
export type ExportType = 'orders' | 'customers' | 'tasks' | 'analytics' | 'production' | 'inventory' | 'contracts'

export interface ExportOptions {
  format: ExportFormat
  type: ExportType
  data: unknown[]
  columns?: string[]
  filename?: string
  filters?: Record<string, unknown>
  title?: string
  metadata?: Record<string, unknown>
}

export interface ExportResult {
  success: boolean
  data?: string | ArrayBuffer
  filename: string
  downloadUrl?: string
  error?: string
}

export class ExportService {
  private supabase = createClient()

  async export(options: ExportOptions): Promise<ExportResult> {
    try {
      const filename = options.filename || this.generateFilename(options.type, options.format)
      
      // Save export configuration
      await this.saveExportHistory({
        export_type: options.type,
        format: options.format,
        file_name: filename,
        record_count: options.data.length,
        status: 'processing',
        metadata: options.metadata
      })

      let result: ExportResult

      switch (options.format) {
        case 'csv':
          result = this.exportToCSV(options.data, filename, options.columns)
          break
        case 'pdf':
          result = this.exportToPDF(options.data, filename, options.title, options.columns)
          break
        case 'excel':
          result = await this.exportToExcel(options.data, filename, options.columns)
          break
        case 'json':
          result = this.exportToJSON(options.data, filename)
          break
        case 'xml':
          result = this.exportToXML(options.data, filename, options.type)
          break
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }

      // Update export history with completion
      if (result.success) {
        await this.updateExportHistory(filename, {
          status: 'completed',
          file_url: result.downloadUrl,
          completed_at: new Date().toISOString()
        })
      }

      return result
    } catch (error) {
      console.error('Export error:', error)
      const filename = options.filename || this.generateFilename(options.type, options.format)
      
      await this.updateExportHistory(filename, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })

      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Export failed'
      }
    }
  }

  private exportToCSV(data: unknown[], filename: string, columns?: string[]): ExportResult {
    try {
      const filteredData = columns ? this.filterColumns(data, columns) : data
      const csv = Papa.unparse(filteredData, {
        header: true,
        skipEmptyLines: true
      })

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const downloadUrl = URL.createObjectURL(blob)

      return {
        success: true,
        data: csv,
        filename,
        downloadUrl
      }
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'CSV export failed'
      }
    }
  }

  private exportToPDF(data: unknown[], filename: string, title?: string, columns?: string[]): ExportResult {
    try {
      const doc = new jsPDF()
      
      // Add title
      if (title) {
        doc.setFontSize(18)
        doc.text(title, 14, 15)
        doc.setFontSize(11)
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25)
      }

      // Prepare data for table
      const filteredData = columns ? this.filterColumns(data, columns) : data
      const headers = filteredData.length > 0 ? Object.keys(filteredData[0] as Record<string, unknown>) : []
      const rows = filteredData.map(item => headers.map(header => String((item as Record<string, unknown>)[header] || '')))

      // Add table
      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: title ? 35 : 20,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [70, 130, 180],
          textColor: 255
        },
        columnStyles: {
          // Auto-adjust column widths
        },
        margin: { top: 20 }
      })

      const pdfData = doc.output('arraybuffer')
      const blob = new Blob([pdfData], { type: 'application/pdf' })
      const downloadUrl = URL.createObjectURL(blob)

      return {
        success: true,
        data: pdfData,
        filename,
        downloadUrl
      }
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'PDF export failed'
      }
    }
  }

  private async exportToExcel(data: unknown[], filename: string, columns?: string[]): Promise<ExportResult> {
    try {
      const filteredData = columns ? this.filterColumns(data, columns) : data
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Data')
      
      if (filteredData.length > 0) {
        const headers = Object.keys(filteredData[0] as Record<string, unknown>)
        worksheet.addRow(headers)
        
        filteredData.forEach(item => {
          const row = headers.map(header => (item as Record<string, unknown>)[header] || '')
          worksheet.addRow(row)
        })
        
        // Auto-size columns
        worksheet.columns.forEach(column => {
          const lengths = column.values?.map(v => v ? v.toString().length : 10) || []
          const maxLength = Math.max(...lengths.filter(v => typeof v === 'number'))
          column.width = Math.min(Math.max(maxLength + 2, 10), 50)
        })
        
        // Style headers
        const headerRow = worksheet.getRow(1)
        headerRow.font = { bold: true }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4682B4' }
        }
      }

      const excelBuffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      const downloadUrl = URL.createObjectURL(blob)

      return {
        success: true,
        data: excelBuffer,
        filename,
        downloadUrl
      }
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Excel export failed'
      }
    }
  }

  private exportToJSON(data: unknown[], filename: string): ExportResult {
    try {
      const jsonString = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const downloadUrl = URL.createObjectURL(blob)

      return {
        success: true,
        data: jsonString,
        filename,
        downloadUrl
      }
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'JSON export failed'
      }
    }
  }

  private exportToXML(data: unknown[], filename: string, rootElement: string): ExportResult {
    try {
      const xmlData = js2xmlparser.parse(rootElement, { items: data }, {
        declaration: { encoding: 'UTF-8' },
        format: { pretty: true }
      })

      const blob = new Blob([xmlData], { type: 'application/xml' })
      const downloadUrl = URL.createObjectURL(blob)

      return {
        success: true,
        data: xmlData,
        filename,
        downloadUrl
      }
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'XML export failed'
      }
    }
  }

  private filterColumns(data: unknown[], columns: string[]): unknown[] {
    return data.map(item => {
      const filtered: Record<string, unknown> = {}
      columns.forEach(column => {
        if ((item as Record<string, unknown>).hasOwnProperty(column)) {
          filtered[column] = (item as Record<string, unknown>)[column]
        }
      })
      return filtered
    })
  }

  private calculateColumnWidths(data: unknown[]): unknown[] {
    if (data.length === 0) return []

    const headers = Object.keys(data[0] as Record<string, unknown>)
    return headers.map(header => {
      const maxLength = Math.max(
        header.length,
        ...data.map(row => String((row as Record<string, unknown>)[header] || '').length)
      )
      return { width: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
  }

  private generateFilename(type: ExportType, format: ExportFormat): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    return `${type}-export-${timestamp}.${format === 'excel' ? 'xlsx' : format}`
  }

  private async saveExportHistory(data: unknown) {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return

      const { error } = await this.supabase
        .from('export_history')
        .insert({
          user_id: user.user.id,
          ...(data as Record<string, unknown>)
        })

      if (error) {
        console.error('Failed to save export history:', error)
      }
    } catch (error) {
      console.error('Export history save error:', error)
    }
  }

  private async updateExportHistory(filename: string, updates: unknown) {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return

      const { error } = await this.supabase
        .from('export_history')
        .update(updates)
        .eq('file_name', filename)
        .eq('user_id', user.user.id)

      if (error) {
        console.error('Failed to update export history:', error)
      }
    } catch (error) {
      console.error('Export history update error:', error)
    }
  }

  // Bulk export operations
  async bulkExport(exports: ExportOptions[]): Promise<ExportResult[]> {
    const results: ExportResult[] = []
    
    for (const exportOption of exports) {
      const result = await this.export(exportOption)
      results.push(result)
    }

    return results
  }

  // Get export history
  async getExportHistory(limit = 50) {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return { data: [], error: 'Not authenticated' }

      const { data, error } = await this.supabase
        .from('export_history')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(limit)

      return { data: data || [], error }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch history' 
      }
    }
  }

  // Save export configuration
  async saveExportConfiguration(config: {
    name: string
    export_type: ExportType
    format: ExportFormat
    columns?: string[]
    filters?: Record<string, unknown>
    schedule?: unknown
  }) {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return { error: 'Not authenticated' }

      const { data, error } = await this.supabase
        .from('export_configurations')
        .insert({
          user_id: user.user.id,
          ...config
        })
        .select()

      return { data, error }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Failed to save configuration' 
      }
    }
  }

  // Get saved export configurations
  async getExportConfigurations() {
    try {
      const { data: user } = await this.supabase.auth.getUser()
      if (!user.user) return { data: [], error: 'Not authenticated' }

      const { data, error } = await this.supabase
        .from('export_configurations')
        .select('*')
        .eq('user_id', user.user.id)
        .eq('is_active', true)
        .order('name')

      return { data: data || [], error }
    } catch (error) {
      return { 
        data: [], 
        error: error instanceof Error ? error.message : 'Failed to fetch configurations' 
      }
    }
  }
}

// Singleton instance
export const exportService = new ExportService()