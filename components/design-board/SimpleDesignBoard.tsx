'use client';

import React, { useState } from 'react';
import SimpleCanvas from './SimpleCanvas';
import DesignToolbar from './DesignToolbar';
import DocumentHandler from './DocumentHandler';

interface SimpleDesignBoardProps {
  boardId: string;
}

export default function SimpleDesignBoard({}: SimpleDesignBoardProps) {
  const [activeTool, setActiveTool] = useState<'select' | 'rectangle' | 'circle' | 'line' | 'pen' | 'text' | 'pan'>('pen');
  const [showDocumentHandler, setShowDocumentHandler] = useState(false);

  const handleToolChange = (tool: typeof activeTool) => {
    setActiveTool(tool);
  };

  const handleAddDocument = () => {
    setShowDocumentHandler(true);
  };

  const handleDocumentAdded = (imageUrl: string, type: string) => {
    console.log('Document added:', imageUrl, type);
    setShowDocumentHandler(false);
  };

  const handleExport = () => {
    console.log('Export functionality would go here');
  };

  const handleClear = () => {
    window.location.reload();
  };

  const handleUndo = () => {
    console.log('Undo functionality would go here');
  };

  const handleRedo = () => {
    console.log('Redo functionality would go here');
  };

  return (
    <div className="relative h-screen bg-[#f7f7f7] overflow-hidden">
      {/* Design Toolbar */}
      <div className="absolute top-4 left-4 right-4 z-50">
        <DesignToolbar
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onAddDocument={handleAddDocument}
          onExport={handleExport}
          onClear={handleClear}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={false}
          canRedo={false}
          boardName="Simple Mural Board"
          collaboratorCount={0}
        />
      </div>

      {/* Main Canvas Area */}
      <div className="absolute inset-0 pt-20 flex items-center justify-center">
        <SimpleCanvas
          width={1200}
          height={700}
          className="w-full h-full max-w-6xl max-h-[calc(100vh-120px)]"
        />
      </div>

      {/* Document Handler Modal */}
      <DocumentHandler
        isOpen={showDocumentHandler}
        onClose={() => setShowDocumentHandler(false)}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  );
}