'use client'

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { safeGet } from '@/lib/utils/bulk-type-fixes';

interface DocumentPermissions {
  can_access_documents: boolean;
  can_download: boolean;
  can_upload: boolean;
  can_delete: boolean;
  can_approve: boolean;
  can_share: boolean;
  max_upload_size_mb: number;
  storage_quota_gb: number | null;
  access_expires_at: string | null;
  download_expires_at: string | null;
  permission_history: unknown[] | null;
}

interface UserDocumentPermissionsProps {
  userId: string;
  userName?: string;
}

export default function UserDocumentPermissions({ userId, userName }: UserDocumentPermissionsProps) {
  const [permissions, setPermissions] = useState<DocumentPermissions>({
    can_access_documents: true,
    can_download: true,
    can_upload: true,
    can_delete: false,
    can_approve: false,
    can_share: false,
    max_upload_size_mb: 50,
    storage_quota_gb: null,
    access_expires_at: null,
    download_expires_at: null,
    permission_history: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Try to get existing permissions
      const { data } = await supabase
        .from('user_document_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setPermissions(data);
      }
      // If no data, use defaults (component state)
    } catch (error) {
      console.error('Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      loadPermissions();
    }
  }, [userId, loadPermissions]);

  const updatePermission = async (field: string, value: unknown, reason: string | null = null) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      
      // Use the update function for audit trail
      const { error } = await supabase.rpc('update_user_document_permission', {
        p_user_id: userId,
        p_field: field,
        p_value: value,
        p_reason: reason || `${field} changed via admin panel`,
      });

      if (error) throw error;

      setPermissions(prev => ({ ...prev, [field]: value }));
      setMessage({ type: 'success', text: 'Permission updated successfully' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating permission:', error);
      setMessage({ type: 'error', text: 'Failed to update permission' });
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (preset: string) => {
    setSaving(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      
      const { error } = await supabase.rpc('apply_permission_preset', {
        p_user_id: userId,
        p_preset: preset,
        p_reason: `${preset} preset applied via admin panel`,
      });

      if (error) throw error;

      // Reload permissions to get updated values
      await loadPermissions();
      setMessage({ type: 'success', text: `${preset} preset applied` });
      
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error applying preset:', error);
      setMessage({ type: 'error', text: 'Failed to apply preset' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-stone-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-10 bg-stone-200 rounded"></div>
              <div className="h-10 bg-stone-200 rounded"></div>
              <div className="h-10 bg-stone-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document System Permissions</CardTitle>
        <p className="text-sm text-graphite">Control document access for {userName || 'this user'}</p>
      </CardHeader>
      <CardContent>
        {/* Message Alert */}
        {message && (
          <div className={`mb-4 p-3 rounded-md ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Quick Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-heading mb-2">Quick Presets</label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('view_only')}
              disabled={saving}
            >
              View Only
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('contributor')}
              disabled={saving}
            >
              Contributor
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('manager')}
              disabled={saving}
            >
              Manager
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => applyPreset('restricted')}
              disabled={saving}
            >
              No Access
            </Button>
          </div>
        </div>

        {/* Master Toggle */}
        <Card className="mb-6 border-2 border-stone-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-heading">Document System Access</h4>
                <p className="text-sm text-graphite">Master switch - hides entire document system when off</p>
              </div>
              <Switch
                checked={permissions.can_access_documents}
                onCheckedChange={(checked) => updatePermission('can_access_documents', checked)}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Individual Permissions - Only show if system is enabled */}
        {permissions.can_access_documents && (
          <div className="space-y-4">
            {/* Download Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-glacier-50 transition-colors">
              <div>
                <span className="font-medium text-heading">Allow Downloads</span>
                <p className="text-sm text-graphite">When off, user can only view files (no download button)</p>
              </div>
              <Switch
                checked={permissions.can_download}
                onCheckedChange={(checked) => updatePermission('can_download', checked)}
                disabled={saving}
              />
            </div>

            {/* Upload Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-glacier-50 transition-colors">
              <div>
                <span className="font-medium text-heading">Allow Uploads</span>
                <p className="text-sm text-graphite">User can upload new documents</p>
              </div>
              <Switch
                checked={permissions.can_upload}
                onCheckedChange={(checked) => updatePermission('can_upload', checked)}
                disabled={saving}
              />
            </div>

            {/* Delete Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-glacier-50 transition-colors">
              <div>
                <span className="font-medium text-heading">Allow Delete</span>
                <p className="text-sm text-graphite">User can delete documents (soft delete only)</p>
              </div>
              <Switch
                checked={permissions.can_delete}
                onCheckedChange={(checked) => updatePermission('can_delete', checked)}
                disabled={saving}
              />
            </div>

            {/* Approve Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-glacier-50 transition-colors">
              <div>
                <span className="font-medium text-heading">Can Approve</span>
                <p className="text-sm text-graphite">User can approve/reject documents in workflows</p>
              </div>
              <Switch
                checked={permissions.can_approve}
                onCheckedChange={(checked) => updatePermission('can_approve', checked)}
                disabled={saving}
              />
            </div>

            {/* Share Permission */}
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-glacier-50 transition-colors">
              <div>
                <span className="font-medium text-heading">Can Share</span>
                <p className="text-sm text-graphite">User can share documents with others</p>
              </div>
              <Switch
                checked={permissions.can_share}
                onCheckedChange={(checked) => updatePermission('can_share', checked)}
                disabled={saving}
              />
            </div>

            {/* Advanced Settings Toggle */}
            <Button
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start"
            >
              <span className="mr-2">{showAdvanced ? '▼' : '▶'}</span>
              Advanced Settings
            </Button>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-stone-200">
                {/* Max Upload Size */}
                <div>
                  <label className="block text-sm font-medium text-heading mb-1">
                    Max Upload Size (MB)
                  </label>
                  <input
                    type="number"
                    value={permissions.max_upload_size_mb}
                    onChange={(e) => updatePermission('max_upload_size_mb', parseInt(e.target.value))}
                    disabled={saving}
                    min="1"
                    max="5000"
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Storage Quota */}
                <div>
                  <label className="block text-sm font-medium text-heading mb-1">
                    Storage Quota (GB) - Leave empty for unlimited
                  </label>
                  <input
                    type="number"
                    value={permissions.storage_quota_gb || ''}
                    onChange={(e) => updatePermission('storage_quota_gb', e.target.value ? parseFloat(e.target.value) : null)}
                    disabled={saving}
                    min="0.1"
                    step="0.1"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Access Expiry */}
                <div>
                  <label className="block text-sm font-medium text-heading mb-1">
                    Access Expires On
                  </label>
                  <input
                    type="datetime-local"
                    value={permissions.access_expires_at ? (permissions.access_expires_at || []).slice(0, 16) : ''}
                    onChange={(e) => updatePermission('access_expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    disabled={saving}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                {/* Download Expiry */}
                <div>
                  <label className="block text-sm font-medium text-heading mb-1">
                    Download Permission Expires On
                  </label>
                  <input
                    type="datetime-local"
                    value={permissions.download_expires_at ? (permissions.download_expires_at || []).slice(0, 16) : ''}
                    onChange={(e) => updatePermission('download_expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)}
                    disabled={saving}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-graphite mt-1">After this date, user will have view-only access</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Permission History */}
        {permissions.permission_history && (permissions.permission_history || []).length > 0 && (
          <div className="mt-6 pt-6 border-t border-stone-200">
            <h4 className="text-sm font-medium text-heading mb-2">Recent Changes</h4>
            <div className="space-y-1 text-xs text-graphite">
              {(permissions.permission_history || []).slice(-3).reverse().map((entry: unknown, idx: number) => (
                <div key={idx}>
                  {new Date(String(safeGet(entry, ['changed_at']) || new Date().toISOString())).toLocaleDateString()} - 
                  {String(safeGet(entry, ['field']) || 'field')}: {String(safeGet(entry, ['old_value']) || 'N/A')} → {String(safeGet(entry, ['new_value']) || 'N/A')}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}