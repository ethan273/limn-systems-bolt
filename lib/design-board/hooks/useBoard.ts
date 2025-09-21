'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';

interface BoardData {
  id: string;
  name: string;
  description?: string;
  project_id?: string;
  thumbnail?: string;
  is_template?: boolean;
  is_public?: boolean;
  settings: {
    gridSize: number;
    backgroundColor: string;
    gridVisible: boolean;
    snapToGrid: boolean;
  };
  created_by: string;
  organization_id?: string;
  created_at: string;
  updated_at: string;
  snapshot?: unknown;
}

interface UseBoardOptions {
  enabled?: boolean;
  autoSave?: boolean;
  saveDelay?: number;
}

export function useBoard(boardId: string, options: UseBoardOptions = {}) {
  const {
    enabled = true,
    saveDelay = 2000
  } = options;

  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const supabase = createClient();

  // Fetch board data
  const fetchBoard = useCallback(async () => {
    if (!enabled || !boardId || boardId === 'new') return;

    setLoading(true);
    setError(null);

    try {
      const { data: result, error: fetchError } = await supabase
        .from('design_boards')
        .select('*')
        .eq('id', boardId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!mountedRef.current) return;

      setBoardData(result);
    } catch (err: unknown) {
      console.error('Error fetching board:', err);
      setError(formatErrorMessage(err, 'fetch board'));
      setBoardData(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [boardId, enabled, supabase]);

  // Create new board
  const createBoard = useCallback(async (newBoardData: Partial<BoardData>) => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const boardToCreate = {
        name: 'Untitled Board',
        description: '',
        settings: {
          gridSize: 20,
          backgroundColor: '#f7f7f7',
          gridVisible: true,
          snapToGrid: true
        },
        is_template: false,
        is_public: false,
        created_by: user.id,
        ...newBoardData
      };

      const { data: result, error: createError } = await supabase
        .from('design_boards')
        .insert([boardToCreate])
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      if (!mountedRef.current) return null;

      setBoardData(result);
      setLastSaved(new Date());
      
      return result;
    } catch (err: unknown) {
      console.error('Error creating board:', err);
      setError(formatErrorMessage(err, 'create board'));
      return null;
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [supabase]);

  // Save board data with debouncing
  const saveBoardData = useCallback(async (snapshot?: unknown, boardUpdates?: Partial<BoardData>) => {
    if (!boardData && boardId !== 'new') return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Handle new board creation
    if (boardId === 'new') {
      saveTimeoutRef.current = setTimeout(async () => {
        await createBoard({ snapshot, ...boardUpdates });
      }, saveDelay);
      return;
    }

    // Debounce saves for existing boards
    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      setError(null);

      try {
        const updateData: Partial<BoardData> = {
          updated_at: new Date().toISOString(),
          ...boardUpdates
        };

        // Include snapshot if provided
        if (snapshot !== undefined) {
          updateData.snapshot = snapshot;
        }

        const { data: result, error: saveError } = await supabase
          .from('design_boards')
          .update(updateData)
          .eq('id', boardData!.id)
          .select()
          .single();

        if (saveError) {
          throw new Error(saveError.message);
        }

        if (!mountedRef.current) return;

        setBoardData(result);
        setLastSaved(new Date());
      } catch (err: unknown) {
        console.error('Error saving board:', err);
        setError(formatErrorMessage(err, 'save board'));
      } finally {
        if (mountedRef.current) {
          setSaving(false);
        }
      }
    }, saveDelay);
  }, [boardData, boardId, saveDelay, supabase, createBoard]);

  // Update board metadata
  const updateBoardMetadata = useCallback(async (updates: Partial<BoardData>) => {
    if (!boardData) return false;

    setSaving(true);
    setError(null);

    try {
      const { data: result, error: updateError } = await supabase
        .from('design_boards')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', boardData.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      if (!mountedRef.current) return false;

      setBoardData(result);
      setLastSaved(new Date());
      return true;
    } catch (err: unknown) {
      console.error('Error updating board metadata:', err);
      setError(formatErrorMessage(err, 'update board'));
      return false;
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [boardData, supabase]);

  // Delete board
  const deleteBoard = useCallback(async () => {
    if (!boardData) return false;

    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('design_boards')
        .delete()
        .eq('id', boardData.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setBoardData(null);
      return true;
    } catch (err: unknown) {
      console.error('Error deleting board:', err);
      setError(formatErrorMessage(err, 'delete board'));
      return false;
    } finally {
      if (mountedRef.current) {
        setSaving(false);
      }
    }
  }, [boardData, supabase]);

  // Check board permissions
  const checkPermissions = useCallback(async () => {
    if (!boardData) return null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return { role: null, canEdit: false, canView: false };

      // Check if user is the creator
      if (boardData.created_by === user.id) {
        return { role: 'admin', canEdit: true, canView: true };
      }

      // Check board permissions
      const { data: permission, error } = await supabase
        .from('board_permissions')
        .select('role')
        .eq('board_id', boardData.id)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw new Error(error.message);
      }

      const role = permission?.role || (boardData.is_public ? 'viewer' : null);
      
      return {
        role,
        canEdit: role === 'admin' || role === 'editor',
        canView: role === 'admin' || role === 'editor' || role === 'viewer' || boardData.is_public
      };
    } catch (err: unknown) {
      console.error('Error checking board permissions:', err);
      return { role: null, canEdit: false, canView: false };
    }
  }, [boardData, supabase]);

  // Initialize board data
  useEffect(() => {
    mountedRef.current = true;
    
    if (boardId === 'new') {
      setBoardData(null);
      setLoading(false);
    } else {
      fetchBoard();
    }

    return () => {
      mountedRef.current = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [fetchBoard, boardId]);

  return {
    boardData,
    loading,
    saving,
    error,
    lastSaved,
    saveBoardData,
    updateBoardMetadata,
    deleteBoard,
    checkPermissions,
    refetch: fetchBoard,
    createBoard
  };
}