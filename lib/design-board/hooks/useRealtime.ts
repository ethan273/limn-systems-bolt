'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatErrorMessage } from '@/lib/error-handling';
import { Canvas } from 'fabric';

interface PresenceData {
  id: string;
  board_id: string;
  user_id: string;
  cursor_position?: {
    x: number;
    y: number;
  };
  viewport?: {
    x: number;
    y: number;
    z: number;
  };
  selected_objects: string[];
  color: string;
  is_active: boolean;
  last_seen: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
}

interface UseRealtimeOptions {
  enabled?: boolean;
  presenceUpdateDelay?: number;
}

const PRESENCE_COLORS = [
  '#88c0c0', // Limn primary
  '#db7f38', // Limn accent
  '#16a34a', // Green
  '#dc2626', // Red
  '#7c3aed', // Purple
  '#ea580c', // Orange
  '#0ea5e9', // Blue
  '#ca8a04'  // Yellow
];

export function useRealtime(
  boardId: string, 
  canvas: Canvas | null, 
  options: UseRealtimeOptions = {}
) {
  const {
    enabled = true,
    presenceUpdateDelay = 100
  } = options;

  const [presenceData, setPresenceData] = useState<PresenceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const supabase = createClient();
  const presenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const currentUserRef = useRef<string | null>(null);
  const userColorRef = useRef<string>(PRESENCE_COLORS[0]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Initialize user color
  const initializeUserColor = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserRef.current = user.id;
        // Assign color based on user ID hash
        const hash = user.id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        userColorRef.current = PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
      }
    } catch (err) {
      console.error('Error getting user for color assignment:', err);
    }
  }, [supabase]);

  // Update presence data
  const updatePresence = useCallback(async (updates: Partial<PresenceData>) => {
    if (!enabled || !boardId || !currentUserRef.current) return;

    // Clear existing timeout
    if (presenceTimeoutRef.current) {
      clearTimeout(presenceTimeoutRef.current);
    }

    // Debounce presence updates
    presenceTimeoutRef.current = setTimeout(async () => {
      try {
        const presenceUpdate = {
          board_id: boardId,
          user_id: currentUserRef.current!,
          cursor_position: updates.cursor_position,
          viewport: updates.viewport,
          selected_objects: updates.selected_objects || [],
          color: userColorRef.current,
          is_active: true,
          last_seen: new Date().toISOString()
        };

        const { error: upsertError } = await supabase
          .from('board_presence')
          .upsert(presenceUpdate, {
            onConflict: 'board_id,user_id'
          });

        if (upsertError) {
          throw new Error(upsertError.message);
        }
      } catch (err: unknown) {
        console.error('Error updating presence:', err);
        setError(formatErrorMessage(err, 'update presence'));
      }
    }, presenceUpdateDelay);
  }, [enabled, boardId, presenceUpdateDelay, supabase]);


  // Handle canvas viewport changes
  const handleCanvasViewport = useCallback(() => {
    if (!canvas) return;
    
    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;
    
    updatePresence({
      viewport: {
        x: vpt ? vpt[4] : 0,
        y: vpt ? vpt[5] : 0,
        z: zoom
      }
    });
  }, [canvas, updatePresence]);

  // Handle canvas selection changes
  const handleCanvasSelection = useCallback(() => {
    if (!canvas) return;
    
    const activeObjects = canvas.getActiveObjects();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedIds = activeObjects.map((obj: any) => obj.id || obj.toString());
    
    updatePresence({
      selected_objects: selectedIds
    });
  }, [canvas, updatePresence]);

  // Fetch current presence data
  const fetchPresenceData = useCallback(async () => {
    if (!enabled || !boardId) return;

    try {
      const { data: presence, error: presenceError } = await supabase
        .from('board_presence')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_active', true)
        .neq('user_id', currentUserRef.current || '');

      if (presenceError) {
        throw new Error(presenceError.message);
      }

      if (mountedRef.current) {
        setPresenceData(presence || []);
      }
    } catch (err: unknown) {
      console.error('Error fetching presence data:', err);
      setError(formatErrorMessage(err, 'fetch presence data'));
    }
  }, [enabled, boardId, supabase]);

  // Set up real-time subscriptions
  const setupRealtimeSubscription = useCallback(async () => {
    if (!enabled || !boardId) return;

    setLoading(true);
    setConnectionStatus('connecting');

    try {
      // Clean up existing channel
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
      }

      // Create new channel for this board
      const channel = supabase.channel(`board-${boardId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUserRef.current || 'anonymous' }
        }
      });

      channelRef.current = channel;

      // Subscribe to presence changes
      channel
        .on('presence', { event: 'sync' }, () => {
          try {
            const state = channel.presenceState();
            const presence = Object.values(state).flat() as unknown as PresenceData[];
            
            if (mountedRef.current) {
              setPresenceData(presence.filter(p => p.user_id !== currentUserRef.current));
              setConnectionStatus('connected');
            }
          } catch (error) {
            console.warn('Error syncing presence:', error);
          }
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        });

      // Subscribe to board object changes
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'board_objects',
          filter: `board_id=eq.${boardId}`
        }, () => {
          console.log('Board objects changed');
          // Handle real-time board object updates
          if (canvas) {
            // Update fabric canvas with changes
            // This would need more sophisticated conflict resolution
          }
        });

      // Subscribe to board presence changes
      channel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'board_presence',
          filter: `board_id=eq.${boardId}`
        }, async () => {
          // Refetch presence data to get updated user info
          await fetchPresenceData();
        });

      await channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
          setError('Failed to connect to real-time updates');
        }
      });

      // Track our own presence
      if (currentUserRef.current) {
        await channel.track({
          user_id: currentUserRef.current,
          color: userColorRef.current,
          online_at: new Date().toISOString()
        });
      }

    } catch (err: unknown) {
      console.error('Error setting up real-time subscription:', err);
      setError(formatErrorMessage(err, 'set up real-time connection'));
      setConnectionStatus('disconnected');
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, boardId, canvas, supabase, fetchPresenceData]);

  // Clean up stale presence on unmount
  const cleanupPresence = useCallback(async () => {
    if (!currentUserRef.current || !boardId) return;

    try {
      await supabase
        .from('board_presence')
        .update({ is_active: false })
        .eq('board_id', boardId)
        .eq('user_id', currentUserRef.current);
    } catch (err) {
      console.error('Error cleaning up presence:', err);
    }
  }, [boardId, supabase]);

  // Set up canvas event listeners
  useEffect(() => {
    if (!canvas) return;

    const handleCanvasChange = () => {
      try {
        handleCanvasViewport();
        handleCanvasSelection();
      } catch (error) {
        console.warn('Error handling canvas change:', error);
      }
    };

    // Listen to canvas events
    canvas.on('selection:created', handleCanvasChange);
    canvas.on('selection:updated', handleCanvasChange);
    canvas.on('selection:cleared', handleCanvasChange);
    // canvas.on('viewport:changed', handleCanvasChange); // This event doesn't exist in Fabric v6

    return () => {
      canvas.off('selection:created', handleCanvasChange);
      canvas.off('selection:updated', handleCanvasChange);
      canvas.off('selection:cleared', handleCanvasChange);
      // canvas.off('viewport:changed', handleCanvasChange); // This event doesn't exist in Fabric v6
    };
  }, [canvas, handleCanvasViewport, handleCanvasSelection]);

  // Initialize and cleanup
  useEffect(() => {
    mountedRef.current = true;

    const initialize = async () => {
      await initializeUserColor();
      await setupRealtimeSubscription();
      await fetchPresenceData();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      
      // Clear timeouts
      if (presenceTimeoutRef.current) {
        clearTimeout(presenceTimeoutRef.current);
      }

      // Clean up presence
      cleanupPresence();

      // Clean up channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [initializeUserColor, setupRealtimeSubscription, fetchPresenceData, cleanupPresence, supabase]);

  return {
    presenceData,
    loading,
    error,
    connectionStatus,
    updatePresence,
    userColor: userColorRef.current,
    refetch: fetchPresenceData
  };
}