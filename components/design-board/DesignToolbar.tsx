'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  MousePointer,
  Square,
  Circle,
  Minus,
  Pen,
  Type,
  Upload,
  Download,
  Trash2,
  Undo,
  Redo,
  Palette,
  Users,
  Share2,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';

export type ToolType = 'select' | 'rectangle' | 'circle' | 'line' | 'pen' | 'text' | 'pan';

interface DesignToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onAddDocument: () => void;
  onExport: () => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  boardName?: string;
  collaboratorCount?: number;
  className?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetView?: () => void;
  zoomLevel?: number;
}

const DesignToolbar: React.FC<DesignToolbarProps> = ({
  activeTool,
  onToolChange,
  onAddDocument,
  onExport,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  boardName = 'Untitled Board',
  collaboratorCount = 0,
  className = '',
  onZoomIn,
  onZoomOut,
  onResetView,
  zoomLevel = 1,
}) => {
  const tools = [
    { id: 'select' as const, icon: MousePointer, label: 'Select', shortcut: 'V' },
    { id: 'rectangle' as const, icon: Square, label: 'Rectangle', shortcut: 'R' },
    { id: 'circle' as const, icon: Circle, label: 'Circle', shortcut: 'O' },
    { id: 'line' as const, icon: Minus, label: 'Line', shortcut: 'L' },
    { id: 'pen' as const, icon: Pen, label: 'Pen', shortcut: 'P' },
    { id: 'text' as const, icon: Type, label: 'Text', shortcut: 'T' },
  ];

  const isToolActive = useCallback((toolId: ToolType) => {
    return activeTool === toolId;
  }, [activeTool]);

  return (
    <div className={`design-toolbar ${className}`}>
      <Card className="bg-white/95 backdrop-blur-sm border-slate-200 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            {/* Left section - Limn branding */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-glacier flex items-center justify-center">
                  <Palette className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-900">Design Studio</span>
              </div>
              <div className="h-6 w-px bg-slate-300" />
              <span className="text-sm font-medium text-slate-600">
                Board: {boardName}
              </span>
            </div>

            {/* Center section - Drawing tools */}
            <div className="flex items-center gap-1 bg-glacier-50 rounded-lg p-1">
              {tools.map((tool) => {
                const Icon = tool.icon;
                const active = isToolActive(tool.id);
                
                return (
                  <Button
                    key={tool.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onToolChange(tool.id)}
                    className={`
                      relative h-9 px-3 text-slate-600 hover:text-slate-900 hover:bg-white
                      ${active ? 'bg-white text-glacier shadow-sm border border-glacier-200' : ''}
                    `}
                    title={`${tool.label} (${tool.shortcut})`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="sr-only">{tool.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Right section - Actions and collaboration */}
            <div className="flex items-center gap-2">
              {/* History controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50 disabled:opacity-50"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50 disabled:opacity-50"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-slate-300" />

              {/* Zoom controls */}
              {(onZoomIn || onZoomOut || onResetView) && (
                <>
                  <div className="flex items-center gap-1">
                    {onZoomOut && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onZoomOut}
                        className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                        title="Zoom Out (-)"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                    )}
                    <span className="text-xs text-slate-500 min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    {onZoomIn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onZoomIn}
                        className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                        title="Zoom In (+)"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    )}
                    {onResetView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onResetView}
                        className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                        title="Reset View (Ctrl+0)"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="h-6 w-px bg-slate-300" />
                </>
              )}

              {/* Document actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddDocument}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Upload Document"
                >
                  <Upload className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExport}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Export Board"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                  title="Clear Board"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="h-6 w-px bg-slate-300" />

              {/* Collaboration indicators */}
              {collaboratorCount > 0 && (
                <div className="flex items-center gap-1 mr-2">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">
                    {collaboratorCount + 1}
                  </span>
                </div>
              )}

              {/* Additional actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Share Board"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="More Options"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesignToolbar;