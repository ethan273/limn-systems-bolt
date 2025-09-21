'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Palette, 
  Users, 
  Calendar,
  MoreHorizontal,
  Search,
  Grid3X3,
  List
} from 'lucide-react';
import { formatErrorMessage } from '@/lib/error-handling';

interface BoardData {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  author?: {
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
}

export default function DesignBoardListPage() {
  const router = useRouter();
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const supabase = createClient();

  // Fetch boards
  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: result, error: fetchError } = await supabase
        .from('design_boards')
        .select('*')
        .or(`created_by.eq.${user.id},is_public.eq.true`)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setBoards(result || []);
    } catch (err: unknown) {
      console.error('Error fetching boards:', err);
      setError(formatErrorMessage(err, 'fetch design boards'));
      setBoards([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  // Initialize
  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Create new board
  const handleCreateBoard = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const newBoard = {
        name: 'Untitled Board',
        description: '',
        is_public: false,
        settings: {
          gridSize: 20,
          backgroundColor: '#f7f7f7',
          gridVisible: true,
          snapToGrid: true
        },
        created_by: user.id
      };

      const { data: result, error: createError } = await supabase
        .from('design_boards')
        .insert([newBoard])
        .select()
        .single();

      if (createError) {
        throw new Error(createError.message);
      }

      // Navigate to the new board
      router.push(`/dashboard/design-board-beta/${result.id}`);
    } catch (err: unknown) {
      console.error('Error creating board:', err);
      setError(formatErrorMessage(err, 'create new board'));
    }
  }, [supabase, router]);

  // Filter boards based on search
  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    board.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 86400000) { // Less than 1 day
      return 'Today';
    } else if (diff < 604800000) { // Less than 1 week
      return `${Math.floor(diff / 86400000)} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get user display name
  const getUserDisplayName = (author?: BoardData['author']) => {
    if (!author) return 'Unknown User';
    if (author.user_metadata?.full_name) return author.user_metadata.full_name;
    if (author.user_metadata?.name) return author.user_metadata.name;
    return author.email?.split('@')[0] || 'User';
  };

  if (loading) {
    return (
      <div className="space-y-8 p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="w-48 h-8 bg-slate-200 rounded animate-pulse mb-2" />
            <div className="w-72 h-6 bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="w-32 h-10 bg-slate-200 rounded animate-pulse" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-full h-48 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 text-red-600">⚠</div>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Boards</h3>
          <p className="text-slate-600 font-medium mb-4">{error}</p>
          <Button onClick={fetchBoards}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Design Boards</h1>
          <p className="text-slate-700 font-medium">
            Collaborative design boards for your furniture projects
          </p>
        </div>
        
        <Button onClick={handleCreateBoard} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center border border-slate-200 rounded">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="rounded-none border-none h-9 w-9 p-0"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="rounded-none border-none h-9 w-9 p-0"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Boards grid/list */}
      {filteredBoards.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBoards.map(board => (
              <Card
                key={board.id}
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => router.push(`/dashboard/design-board-beta/${board.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
                    {board.thumbnail ? (
                      <Image 
                        src={board.thumbnail} 
                        alt={`Board thumbnail for ${board.name}`}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <Palette className="w-8 h-8 text-slate-400" />
                    )}
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="outline">
                        Open Board
                      </Button>
                    </div>
                  </div>
                  
                  <CardTitle className="text-lg font-bold text-slate-900 line-clamp-1">
                    {board.name}
                  </CardTitle>
                  
                  {board.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-white font-medium">
                        {getUserDisplayName(board.author).charAt(0).toUpperCase()}
                      </div>
                      <span>{getUserDisplayName(board.author)}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(board.updated_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBoards.map(board => (
              <Card
                key={board.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/dashboard/design-board-beta/${board.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                      {board.thumbnail ? (
                        <Image 
                          src={board.thumbnail} 
                          alt={`Board thumbnail for ${board.name}`}
                          fill
                          className="object-cover rounded-lg"
                        />
                      ) : (
                        <Palette className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-slate-900 text-lg">{board.name}</h3>
                        <div className="flex items-center gap-2">
                          {board.is_public && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Users className="w-3 h-3" />
                              Public
                            </div>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {board.description && (
                        <p className="text-slate-600 text-sm mb-2 line-clamp-1">
                          {board.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-xs text-white font-medium">
                            {getUserDisplayName(board.author).charAt(0).toUpperCase()}
                          </div>
                          <span>by {getUserDisplayName(board.author)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Updated {formatDate(board.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Palette className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {searchQuery ? 'No boards found' : 'No design boards yet'}
          </h3>
          <p className="text-slate-600 font-medium mb-6">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Create your first collaborative design board to get started'
            }
          </p>
          {!searchQuery && (
            <Button onClick={handleCreateBoard} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Board
            </Button>
          )}
        </div>
      )}
    </div>
  );
}