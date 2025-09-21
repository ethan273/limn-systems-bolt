'use client';

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, Rect, Circle, Line, IText, Shadow, Point } from 'fabric';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home, ExternalLink } from 'lucide-react';
import FabricCanvas, { FabricCanvasRef } from './FabricCanvas';
import DesignToolbar, { ToolType } from './DesignToolbar';
import DocumentHandler from './DocumentHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
// Temporarily disabled database integration - using mock hooks
// import { useBoard } from '@/lib/design-board/hooks/useBoard';
// import { useRealtime } from '@/lib/design-board/hooks/useRealtime';

interface DesignBoardProps {
  boardId: string;
  readonly?: boolean;
  fullScreen?: boolean;
}

export default function DesignBoard({ boardId, fullScreen = false }: DesignBoardProps) {
  const router = useRouter();
  const canvasRef = useRef<FabricCanvasRef>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [showDocumentHandler, setShowDocumentHandler] = useState(false);
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isDrawingRef = useRef(false);
  
  // Infinite canvas state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [, setPanX] = useState(0);
  const [, setPanY] = useState(0);
  // const [isPanning, setIsPanning] = useState(false);
  // const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });

  // Navigation handlers
  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  // Temporarily disabled database integration - using mock data
  const boardData = null;
  const saveBoardData = null;
  const boardLoading = false;
  const boardError = null;
  const presenceData = [];
  const realtimeLoading = false;

  // Zoom and pan functions
  const handleZoomIn = useCallback(() => {
    if (!canvas) return;
    const newZoom = Math.min(zoomLevel * 1.2, 5);
    setZoomLevel(newZoom);
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }, [canvas, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (!canvas) return;
    const newZoom = Math.max(zoomLevel * 0.8, 0.1);
    setZoomLevel(newZoom);
    canvas.setZoom(newZoom);
    canvas.renderAll();
  }, [canvas, zoomLevel]);

  const handleResetView = useCallback(() => {
    if (!canvas) return;
    setZoomLevel(1);
    setPanX(0);
    setPanY(0);
    canvas.setZoom(1);
    canvas.absolutePan(new Point(0, 0));
    canvas.renderAll();
  }, [canvas]);

  // Handle canvas initialization
  const handleCanvasReady = useCallback((fabricCanvas: Canvas) => {
    setCanvas(fabricCanvas);
    
    // Load initial board data if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((boardData as any)?.snapshot && fabricCanvas) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fabricCanvas.loadFromJSON((boardData as any).snapshot);
      } catch (error) {
        console.error('Failed to load board data:', error);
      }
    }

    // Set up infinite canvas functionality
    fabricCanvas.on('mouse:wheel', (opt) => {
      const delta = opt.e.deltaY;
      let zoom = fabricCanvas.getZoom();
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.1, Math.min(5, zoom)); // Limit zoom between 0.1x and 5x
      fabricCanvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      setZoomLevel(zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    // Set up panning
    fabricCanvas.on('mouse:down', (opt) => {
      const evt = opt.e as MouseEvent;
      if (evt.altKey === true || activeTool === 'pan') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fabricCanvas as any).isDragging = true;
        fabricCanvas.selection = false;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fabricCanvas as any).lastPosX = evt.clientX;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fabricCanvas as any).lastPosY = evt.clientY;
      }
    });

    fabricCanvas.on('mouse:move', (opt) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((fabricCanvas as any).isDragging) {
        const e = opt.e as MouseEvent;
        const vpt = fabricCanvas.viewportTransform;
        if (vpt) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vpt[4] += e.clientX - (fabricCanvas as any).lastPosX;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          vpt[5] += e.clientY - (fabricCanvas as any).lastPosY;
          setPanX(vpt[4]);
          setPanY(vpt[5]);
          fabricCanvas.requestRenderAll();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fabricCanvas as any).lastPosX = e.clientX;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fabricCanvas as any).lastPosY = e.clientY;
        }
      }
    });

    fabricCanvas.on('mouse:up', () => {
      fabricCanvas.setViewportTransform(fabricCanvas.viewportTransform);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fabricCanvas as any).isDragging = false;
      fabricCanvas.selection = true;
    });

    // Set up drawing tools
    // setupDrawingTools(fabricCanvas);
    
    // Initialize history
    const initialState = fabricCanvas.toJSON();
    setHistory([JSON.stringify(initialState)]);
    setHistoryIndex(0);
  }, [boardData, activeTool]);

  // Set up drawing tools based on active tool
  const setupDrawingTools = useCallback((fabricCanvas: Canvas) => {
    // Clear existing event listeners
    fabricCanvas.off('mouse:down');
    fabricCanvas.off('mouse:move');
    fabricCanvas.off('mouse:up');
    fabricCanvas.off('path:created');

    fabricCanvas.isDrawingMode = false;
    fabricCanvas.selection = true;

    switch (activeTool) {
      case 'select':
        fabricCanvas.defaultCursor = 'default';
        fabricCanvas.hoverCursor = 'move';
        break;

      case 'pen':
        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.width = 2;
          fabricCanvas.freeDrawingBrush.color = '#88c0c0';
          fabricCanvas.freeDrawingBrush.shadow = new Shadow({
          blur: 5,
          offsetX: 0,
          offsetY: 2,
          affectStroke: true,
          color: 'rgba(136, 192, 192, 0.3)',
          });
        }
        break;

      case 'rectangle':
      case 'circle':
      case 'line':
      case 'text':
        fabricCanvas.defaultCursor = 'crosshair';
        setupShapeDrawing(fabricCanvas, activeTool);
        break;

      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool]);

  // Set up shape drawing functionality
  const setupShapeDrawing = useCallback((fabricCanvas: Canvas, tool: ToolType) => {
    let isDown = false;
    let origX = 0;
    let origY = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let shape: any = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:down', (o: any) => {
      if (tool === 'text') {
        const pointer = fabricCanvas.getPointer(o.e);
        const textbox = new IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontFamily: 'Inter, sans-serif',
          fontSize: 16,
          fill: '#334155', // Slate-700
          cornerColor: '#88c0c0',
          cornerSize: 6,
          transparentCorners: false,
        });
        
        fabricCanvas.add(textbox);
        fabricCanvas.setActiveObject(textbox);
        textbox.enterEditing();
        // We'll define addToHistory later in the component
        // addToHistory(fabricCanvas);
        return;
      }

      isDown = true;
      isDrawingRef.current = true;
      const pointer = fabricCanvas.getPointer(o.e);
      origX = pointer.x;
      origY = pointer.y;

      const commonProps = {
        left: origX,
        top: origY,
        fill: 'rgba(136, 192, 192, 0.1)', // Glacier with opacity
        stroke: '#88c0c0',
        strokeWidth: 2,
        cornerColor: '#88c0c0',
        cornerSize: 6,
        transparentCorners: false,
        shadow: new Shadow({
          blur: 5,
          offsetX: 0,
          offsetY: 2,
          color: 'rgba(136, 192, 192, 0.3)',
        }),
      };

      switch (tool) {
        case 'rectangle':
          shape = new Rect({
            ...commonProps,
            width: 0,
            height: 0,
          });
          break;
        case 'circle':
          shape = new Circle({
            ...commonProps,
            radius: 0,
            fill: 'rgba(136, 192, 192, 0.1)',
          });
          break;
        case 'line':
          shape = new Line([origX, origY, origX, origY], {
            stroke: '#88c0c0',
            strokeWidth: 2,
            cornerColor: '#88c0c0',
            cornerSize: 6,
            transparentCorners: false,
          });
          break;
      }

      if (shape) {
        fabricCanvas.add(shape);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fabricCanvas.on('mouse:move', (o: any) => {
      if (!isDown || !shape) return;

      const pointer = fabricCanvas.getPointer(o.e);

      switch (tool) {
        case 'rectangle':
          const rect = shape as Rect;
          rect.set({
            width: Math.abs(pointer.x - origX),
            height: Math.abs(pointer.y - origY),
          });
          if (pointer.x < origX) rect.set({ left: pointer.x });
          if (pointer.y < origY) rect.set({ top: pointer.y });
          break;
        case 'circle':
          const circle = shape as Circle;
          const radius = Math.sqrt(Math.pow(pointer.x - origX, 2) + Math.pow(pointer.y - origY, 2)) / 2;
          circle.set({ radius });
          break;
        case 'line':
          const line = shape as Line;
          line.set({ x2: pointer.x, y2: pointer.y });
          break;
      }

      fabricCanvas.renderAll();
    });

    fabricCanvas.on('mouse:up', () => {
      if (!isDown) return;
      isDown = false;
      isDrawingRef.current = false;
      // We'll define addToHistory later in the component
      // addToHistory(fabricCanvas);
    });
  }, []);

  // History management
  const addToHistory = useCallback((fabricCanvas: Canvas) => {
    const state = JSON.stringify(fabricCanvas.toJSON());
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(state);
    
    // Limit history size
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(prevIndex => prevIndex + 1);
    }
    
    setHistory(newHistory);
    
    // Auto-save with debounce
    if (saveBoardData && typeof saveBoardData === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (saveBoardData as any)(state);
    }
  }, [history, historyIndex, saveBoardData]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0 && canvas) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(history[newIndex]);
    }
  }, [historyIndex, history, canvas]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1 && canvas && canvasRef.current) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      canvas.loadFromJSON(history[newIndex]);
    }
  }, [historyIndex, history, canvas]);

  // Tool change handler
  const handleToolChange = useCallback((tool: ToolType) => {
    setActiveTool(tool);
  }, []);

  // Document handling
  const handleDocumentAdded = useCallback(async (imageUrl: string) => {
    if (!canvas || !canvasRef.current) return;
    
    try {
      await canvasRef.current.setBackgroundImage(imageUrl);
      addToHistory(canvas);
    } catch (error) {
      console.error('Failed to add document:', error);
    }
  }, [canvas, addToHistory]);

  // Export functionality
  const handleExport = useCallback(() => {
    if (!canvas) return;

    // Convert to blob and download
    canvas.toCanvasElement(2).toBlob((blob: Blob | null) => {
      if (blob) {
        saveAs(blob, `design-board-${boardId}.png`);
      }
    });
  }, [canvas, boardId]);

  // Clear canvas
  const handleClear = useCallback(() => {
    if (!canvas) return;
    canvas.clear();
    addToHistory(canvas);
  }, [canvas, addToHistory]);

  // Set up canvas event listeners for collaboration
  useEffect(() => {
    if (!canvas) return;

    const handleObjectModified = () => {
      if (!isDrawingRef.current) {
        addToHistory(canvas);
      }
    };

    canvas.on('object:modified', handleObjectModified);
    canvas.on('path:created', () => addToHistory(canvas));

    return () => {
      canvas.off('object:modified', handleObjectModified);
      canvas.off('path:created');
    };
  }, [canvas, addToHistory]);

  // Update tools when active tool changes
  useEffect(() => {
    if (canvas) {
      setupDrawingTools(canvas);
    }
  }, [canvas, setupDrawingTools]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      } else {
        switch (e.key) {
          case 'v':
          case 'V':
            setActiveTool('select');
            break;
          case 'r':
          case 'R':
            setActiveTool('rectangle');
            break;
          case 'o':
          case 'O':
            setActiveTool('circle');
            break;
          case 'l':
          case 'L':
            setActiveTool('line');
            break;
          case 'p':
          case 'P':
            setActiveTool('pen');
            break;
          case 't':
          case 'T':
            setActiveTool('text');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Canvas dimensions
  const canvasDimensions = useMemo(() => {
    if (typeof window === 'undefined') return { width: 800, height: 600 };
    
    if (fullScreen) {
      // Full screen mode - use entire viewport
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    
    // Dashboard mode - account for navigation header and toolbar (128px total)
    return {
      width: window.innerWidth,
      height: window.innerHeight - 128,
    };
  }, [fullScreen]);

  // Loading state
  if (boardLoading || realtimeLoading) {
    return (
      <div className="h-screen bg-[#f7f7f7] flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <CardContent className="text-center">
            <div className="w-12 h-12 rounded-full bg-glacier/10 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 border-2 border-glacier border-t-transparent rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Loading Design Board</h3>
            <p className="text-slate-600 font-medium">Preparing your collaborative workspace...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (boardError) {
    return (
      <div className="h-screen bg-[#f7f7f7] flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto">
          <CardContent className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <div className="w-6 h-6 text-red-600">⚠</div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Unable to Load Board</h3>
            <p className="text-slate-600 font-medium mb-4">{boardError}</p>
            <Button onClick={() => window.location.reload()} className="bg-glacier hover:bg-glacier-600">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-[#f7f7f7] overflow-hidden">
      {/* Navigation Header - Full screen mode */}
      {!fullScreen && (
        <div className="absolute top-2 left-4 z-[60]">
          <Card className="bg-white/95 backdrop-blur-sm border-slate-200 shadow-lg">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToDashboard}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
                <div className="h-4 w-px bg-slate-300" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoHome}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Go to Homepage"
                >
                  <Home className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(window.location.href, '_blank')}
                  className="text-slate-600 hover:text-slate-900 hover:bg-glacier-50"
                  title="Open in New Window"
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Design Toolbar - positioned below navigation */}
      {!fullScreen && (
        <div className="absolute top-16 left-4 right-4 z-50">
          <DesignToolbar
            activeTool={activeTool}
            onToolChange={handleToolChange}
            onAddDocument={() => setShowDocumentHandler(true)}
            onExport={handleExport}
            onClear={handleClear}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            boardName={(boardData as any)?.name || 'Untitled Board'}
            collaboratorCount={presenceData.length}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            zoomLevel={zoomLevel}
          />
        </div>
      )}

      {/* Main Canvas Area */}
      <div className={`absolute inset-0 ${fullScreen ? '' : 'pt-32'}`}>
        <FabricCanvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          onCanvasReady={handleCanvasReady}
          className="w-full h-full"
        />
      </div>

      {/* Document Handler Modal */}
      {!fullScreen && (
        <DocumentHandler
          isOpen={showDocumentHandler}
          onClose={() => setShowDocumentHandler(false)}
          onDocumentAdded={handleDocumentAdded}
        />
      )}
    </div>
  );
}