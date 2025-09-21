import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/factory-reviews/sessions/[id]/export
 * Export factory review session report as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: sessionId } = await params;

    // Fetch complete session data
    const { data: session, error: sessionError } = await supabase
      .from('factory_review_sessions')
      .select(`
        *,
        factory_review_participants(*),
        factory_review_notes(*),
        shop_drawing_files(*)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching session for export:', sessionError);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Generate HTML report
    const reportHtml = generateReportHtml(session);

    // For now, return HTML content as PDF would require additional libraries
    // In a real implementation, you'd use libraries like puppeteer or jsPDF
    return new NextResponse(reportHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="factory-review-${session.session_name.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.html"`
      }
    });

  } catch (error) {
    console.error('Error in export API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface SessionData {
  id: string;
  session_name: string;
  factory_name: string;
  status: string;
  scheduled_date: string;
  session_notes?: string;
  prototype_count: number;
  reviewed_count: number;
  approved_count: number;
  rejected_count: number;
  factory_review_participants?: Array<{
    name: string;
    role: string;
    company: string;
    can_approve: boolean;
  }>;
  factory_review_notes?: Array<{
    created_by_name: string;
    created_at: string;
    content: string;
    status: string;
    status_reason?: string;
  }>;
  shop_drawing_files?: Array<{
    file_name: string;
    version: number;
    created_by_name: string;
    created_at: string;
    notes?: string;
    is_current: boolean;
  }>;
}

function generateReportHtml(session: SessionData): string {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      'scheduled': 'background-color: #dbeafe; color: #1e40af;',
      'in_progress': 'background-color: #fef3c7; color: #d97706;',
      'completed': 'background-color: #dcfce7; color: #16a34a;',
      'on_hold': 'background-color: #f3f4f6; color: #6b7280;'
    };
    return `<span style="padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: 500; ${colors[status as keyof typeof colors] || colors.on_hold}">${status.replace('_', ' ').toUpperCase()}</span>`;
  };

  const noteStatusColors = {
    'approved': 'color: #16a34a;',
    'cant_complete': 'color: #dc2626;',
    'updated_on_drawing': 'color: #d97706;',
    'in_progress': 'color: #6b7280;'
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factory Review Report - ${session.session_name}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 40px;
      background-color: #f9fafb;
      color: #111827;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .subtitle {
      font-size: 18px;
      color: #6b7280;
      margin-bottom: 15px;
    }
    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 15px;
    }
    .meta-item {
      font-size: 14px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 15px;
      color: #374151;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #111827;
    }
    .stat-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
    }
    .participants-list {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    .participant-card {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
    }
    .participant-name {
      font-weight: 600;
      margin-bottom: 5px;
    }
    .participant-details {
      font-size: 14px;
      color: #6b7280;
    }
    .note-item {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 15px;
      border-left: 4px solid #e5e7eb;
    }
    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 10px;
    }
    .note-author {
      font-weight: 600;
      font-size: 14px;
    }
    .note-date {
      font-size: 12px;
      color: #6b7280;
    }
    .note-content {
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .note-status {
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .files-list {
      background: #f9fafb;
      padding: 20px;
      border-radius: 6px;
    }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .file-item:last-child {
      border-bottom: none;
    }
    .file-name {
      font-weight: 500;
    }
    .file-details {
      font-size: 14px;
      color: #6b7280;
    }
    .generated-date {
      text-align: center;
      color: #6b7280;
      font-size: 12px;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">${session.session_name}</h1>
      <p class="subtitle">${session.factory_name}</p>
      <div class="meta-info">
        <div class="meta-item">Status: ${getStatusBadge(session.status)}</div>
        <div class="meta-item">Scheduled: ${formatDate(session.scheduled_date)}</div>
        <div class="meta-item">Participants: ${session.factory_review_participants?.length || 0}</div>
      </div>
      ${session.session_notes ? `<p><strong>Notes:</strong> ${session.session_notes}</p>` : ''}
    </div>

    <div class="section">
      <h2 class="section-title">Progress Overview</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number">${session.prototype_count}</div>
          <div class="stat-label">Total Prototypes</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${session.reviewed_count}</div>
          <div class="stat-label">Reviewed</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${session.approved_count}</div>
          <div class="stat-label">Approved</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${session.rejected_count}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Participants</h2>
      <div class="participants-list">
        ${session.factory_review_participants?.map((participant) => `
          <div class="participant-card">
            <div class="participant-name">${participant.name}</div>
            <div class="participant-details">
              ${participant.role} • ${participant.company}
              ${participant.can_approve ? ' • Can Approve' : ''}
            </div>
          </div>
        `).join('') || '<p>No participants assigned.</p>'}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Review Notes</h2>
      ${session.factory_review_notes && session.factory_review_notes.length > 0 ?
        session.factory_review_notes.map((note) => `
          <div class="note-item">
            <div class="note-header">
              <div>
                <div class="note-author">${note.created_by_name}</div>
                <div class="note-date">${formatDate(note.created_at)}</div>
              </div>
              <div class="note-status" style="${noteStatusColors[note.status as keyof typeof noteStatusColors] || noteStatusColors.in_progress}">
                ${note.status.replace('_', ' ')}
              </div>
            </div>
            <div class="note-content">${note.content}</div>
            ${note.status_reason ? `<div style="font-style: italic; color: #6b7280; font-size: 14px;">Reason: ${note.status_reason}</div>` : ''}
          </div>
        `).join('') :
        '<p>No review notes yet.</p>'
      }
    </div>

    <div class="section">
      <h2 class="section-title">Shop Drawings</h2>
      ${session.shop_drawing_files && session.shop_drawing_files.length > 0 ? `
        <div class="files-list">
          ${session.shop_drawing_files.map((file) => `
            <div class="file-item">
              <div>
                <div class="file-name">${file.file_name}</div>
                <div class="file-details">Version ${file.version} • ${file.created_by_name} • ${formatDate(file.created_at)}</div>
                ${file.notes ? `<div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${file.notes}</div>` : ''}
              </div>
              <div>${file.is_current ? '✓ Current' : ''}</div>
            </div>
          `).join('')}
        </div>
      ` : '<p>No shop drawings uploaded yet.</p>'}
    </div>

    <div class="generated-date">
      Report generated on ${formatDate(new Date().toISOString())}
    </div>
  </div>
</body>
</html>`;
}