import { NextRequest, NextResponse } from 'next/server';
import { ExportService } from '@/lib/services/export.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { module, exportType, data, columns, filters } = body;

    const exportService = new ExportService();
    const result = await exportService.export({
      format: exportType as 'csv' | 'pdf' | 'excel' | 'json' | 'xml',
      type: module,
      data,
      columns,
      filters,
      title: `${module} Export`
    });

    // Note: Export history logging would be handled by the ExportService internally
    // if needed in the future

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': getMimeType(exportType),
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function getMimeType(exportType: string): string {
  const mimeTypes: Record<string, string> = {
    csv: 'text/csv',
    pdf: 'application/pdf',
    excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json',
    xml: 'application/xml',
  };
  return mimeTypes[exportType] || 'application/octet-stream';
}

