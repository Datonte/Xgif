'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export interface TextOverlay {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  textAnimation?: 'none' | 'fade' | 'slide' | 'bounce';
  rotation?: number; // degrees
  width?: number; // percentage (0-100)
  height?: number; // percentage (0-100)
}

export interface AnimationSettings {
  type: 'none' | 'zoom' | 'pan' | 'fade' | 'bounce' | 'rotate' | 'pulse' | 'shake';
  duration: number; // seconds
  loopCount: number; // 0 = infinite
  frameRate: number; // fps
}

interface GIFEditorProps {
  imagePreview: string;
  onSettingsChange: (settings: {
    animation: AnimationSettings;
    textOverlays: TextOverlay[];
  }) => void;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  type: 'move' | 'resize' | 'rotate';
}

export default function GIFEditor({ imagePreview, onSettingsChange }: GIFEditorProps) {
  const [animation, setAnimation] = useState<AnimationSettings>({
    type: 'zoom',
    duration: 3,
    loopCount: 0,
    frameRate: 15,
  });

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    onSettingsChange({ animation, textOverlays });
  }, [animation, textOverlays, onSettingsChange]);

  // Get image dimensions - both natural and rendered
  useEffect(() => {
    if (imagePreview) {
      const img = new Image();
      img.onload = () => {
        // Store natural dimensions for final GIF processing
        setImageSize({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
      };
      img.src = imagePreview;
    } else {
      setImageSize({ width: 0, height: 0 });
      setRenderedSize({ width: 0, height: 0 });
    }
  }, [imagePreview]);

  // Update rendered size when image element is available
  useEffect(() => {
    const updateRenderedSize = () => {
      if (imageRef.current) {
        const img = imageRef.current;
        if (img.offsetWidth > 0 && img.offsetHeight > 0) {
          setRenderedSize({ 
            width: img.offsetWidth, 
            height: img.offsetHeight 
          });
        }
      }
    };

    updateRenderedSize();
    window.addEventListener('resize', updateRenderedSize);
    return () => window.removeEventListener('resize', updateRenderedSize);
  }, [imagePreview, imageSize]);

  const addTextOverlay = () => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: 'Your text here',
      x: 50,
      y: 50,
      fontSize: 24,
      fontFamily: 'Arial',
      color: '#FFFFFF',
      textAlign: 'center',
      textAnimation: 'none',
      rotation: 0,
      width: 30,
      height: 10,
    };
    setTextOverlays([...textOverlays, newText]);
    setSelectedTextId(newText.id);
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(t => t.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    setTextOverlays(textOverlays.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const selectedText = textOverlays.find(t => t.id === selectedTextId);

  // Convert percentage to pixels
  const percentToPx = (percent: number, dimension: 'width' | 'height') => {
    const size = dimension === 'width' ? imageSize.width : imageSize.height;
    // Fallback to reasonable defaults if size is 0 (image not loaded yet)
    const fallback = dimension === 'width' ? 800 : 600;
    return (percent / 100) * (size || fallback);
  };

  // Get preview animation style based on animation type
  const getPreviewAnimationStyle = () => {
    if (!animation || animation.type === 'none') return {};
    
    const duration = animation.duration || 3;
    
    switch (animation.type) {
      case 'zoom':
        return {
          animation: `zoomPreview ${duration}s ease-in-out infinite`,
        };
      case 'pan':
        return {
          animation: `panPreview ${duration}s ease-in-out infinite`,
        };
      case 'fade':
        return {
          animation: `fadePreview ${duration}s ease-in-out infinite`,
        };
      case 'rotate':
        return {
          animation: `rotatePreview ${duration}s linear infinite`,
        };
      case 'pulse':
        return {
          animation: `pulsePreview ${duration}s ease-in-out infinite`,
        };
      case 'bounce':
        return {
          animation: `bouncePreview ${duration}s ease-in-out infinite`,
        };
      case 'shake':
        return {
          animation: `shakePreview ${duration * 0.5}s ease-in-out infinite`,
        };
      default:
        return {};
    }
  };

  // Convert pixels to percentage
  const pxToPercent = (px: number, dimension: 'width' | 'height') => {
    const total = dimension === 'width' ? imageSize.width : imageSize.height;
    return total > 0 ? (px / total) * 100 : 0;
  };

  // Handle mouse down for dragging/resizing/rotating
  const handleMouseDown = useCallback((e: React.MouseEvent, textId: string, type: 'move' | 'resize' | 'rotate') => {
    e.preventDefault();
    e.stopPropagation();
    
    const text = textOverlays.find(t => t.id === textId);
    if (!text || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const startY = e.clientY - rect.top;
    
    const initialX = percentToPx(text.x, 'width');
    const initialY = percentToPx(text.y, 'height');

    setDragState({ id: textId, startX, startY, initialX, initialY, type });
    setIsDragging(true);
    setSelectedTextId(textId);
  }, [textOverlays, imageSize]);

  // Handle mouse move
  useEffect(() => {
    if (!isDragging || !dragState || !containerRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      
      const deltaX = currentX - dragState.startX;
      const deltaY = currentY - dragState.startY;

      const text = textOverlays.find(t => t.id === dragState.id);
      if (!text) return;

      if (dragState.type === 'move') {
        const newX = Math.max(0, Math.min(100, pxToPercent(dragState.initialX + deltaX, 'width')));
        const newY = Math.max(0, Math.min(100, pxToPercent(dragState.initialY + deltaY, 'height')));
        updateTextOverlay(dragState.id, { x: newX, y: newY });
      } else if (dragState.type === 'resize') {
        const newWidth = Math.max(5, Math.min(100, pxToPercent(Math.abs(deltaX) * 2, 'width')));
        const newHeight = Math.max(5, Math.min(100, pxToPercent(Math.abs(deltaY) * 2, 'height')));
        updateTextOverlay(dragState.id, { 
          width: newWidth || text.width || 30, 
          height: newHeight || text.height || 10 
        });
      } else if (dragState.type === 'rotate') {
        const text = textOverlays.find(t => t.id === dragState.id);
        if (!text) return;
        const centerX = percentToPx(text.x, 'width');
        const centerY = percentToPx(text.y, 'height');
        const angle = Math.atan2(currentY - centerY, currentX - centerX) * (180 / Math.PI);
        updateTextOverlay(dragState.id, { rotation: (angle + 90) % 360 });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragState, textOverlays, imageSize, updateTextOverlay]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
      {/* Preview Canvas */}
      <div className="lg:col-span-2">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          <div 
            ref={containerRef}
            className="relative bg-white dark:bg-gray-900 rounded-lg overflow-hidden"
            style={{ maxHeight: '600px', overflow: 'auto' }}
          >
            {imagePreview ? (
              <div className="relative inline-block" style={{ position: 'relative' }}>
                {/* Animated Image - animation persists independently */}
                <img
                  ref={imageRef}
                  src={imagePreview}
                  alt="Preview"
                  className="max-w-full h-auto"
                  style={{ 
                    display: 'block',
                    position: 'relative',
                    zIndex: 0,
                    ...getPreviewAnimationStyle(),
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                      setImageSize({ 
                        width: img.naturalWidth, 
                        height: img.naturalHeight 
                      });
                      // Also set rendered size after a brief delay to ensure layout is complete
                      setTimeout(() => {
                        if (img.offsetWidth > 0 && img.offsetHeight > 0) {
                          setRenderedSize({ 
                            width: img.offsetWidth, 
                            height: img.offsetHeight 
                          });
                        }
                      }, 100);
                    }
                  }}
                />
                
                {/* Text Overlays - positioned above animated image using RENDERED dimensions */}
                {textOverlays.map((text) => {
                  // Use RENDERED dimensions for preview positioning (scaled image)
                  const displayWidth = renderedSize.width || imageSize.width || 800;
                  const displayHeight = renderedSize.height || imageSize.height || 600;
                  
                  // Calculate scale factor between natural and rendered
                  const scaleX = imageSize.width > 0 ? displayWidth / imageSize.width : 1;
                  const scaleY = imageSize.height > 0 ? displayHeight / imageSize.height : 1;
                  
                  // Position based on rendered size
                  const x = (text.x / 100) * displayWidth;
                  const y = (text.y / 100) * displayHeight;
                  const width = text.width ? (text.width / 100) * displayWidth : 200;
                  const height = text.height ? (text.height / 100) * displayHeight : 50;
                  const rotation = text.rotation || 0;
                  const isSelected = selectedTextId === text.id;

                  return (
                    <div
                      key={text.id}
                      className="absolute"
                      style={{
                        left: `${x}px`,
                        top: `${y}px`,
                        transform: `rotate(${rotation}deg)`,
                        transformOrigin: 'center',
                        cursor: isSelected ? 'move' : 'pointer',
                        zIndex: 20, // Above the animated image
                        pointerEvents: 'auto',
                      }}
                      onClick={() => setSelectedTextId(text.id)}
                    >
                      {/* Text Display Container */}
                      <div
                        className="relative"
                        style={{
                          minWidth: `${width}px`,
                          minHeight: `${height}px`,
                          border: isSelected ? '2px dashed #9333ea' : '1px solid rgba(147, 51, 234, 0.3)',
                          borderRadius: '4px',
                          padding: '4px',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)', // More opaque for better visibility
                          backdropFilter: 'blur(2px)',
                        }}
                      >
                        {/* Display text as rendered (visible) */}
                        <div
                          style={{
                            fontSize: `${text.fontSize}px`,
                            fontFamily: text.fontFamily,
                            color: text.color,
                            textAlign: text.textAlign,
                            fontWeight: 'bold',
                            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.9), 0px 0px 8px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.9)',
                            WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.8)',
                            paintOrder: 'stroke fill',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            padding: '4px',
                            minHeight: `${text.fontSize}px`,
                            lineHeight: '1.3',
                            display: 'block',
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          {text.text || 'Your text here'}
                        </div>
                        
                        {/* Editable Text Input (overlay when selected) */}
                        <textarea
                          value={text.text}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateTextOverlay(text.id, { text: e.target.value });
                          }}
                          onFocus={() => setSelectedTextId(text.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTextId(text.id);
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                          }}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            fontSize: `${text.fontSize}px`,
                            fontFamily: text.fontFamily,
                            color: text.color,
                            textAlign: text.textAlign,
                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                            border: 'none',
                            outline: isSelected ? '2px solid #9333ea' : 'none',
                            resize: 'both',
                            overflow: 'hidden',
                            cursor: 'text',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            padding: '2px',
                            opacity: isSelected ? 1 : 0,
                            zIndex: isSelected ? 5 : 1,
                          }}
                          placeholder="Your text here"
                          className="text-overlay-input"
                        />

                        {/* Selection Handles */}
                        {isSelected && (
                          <>
                            {/* Move Handle (top-left corner) */}
                            <div
                              className="absolute cursor-move bg-purple-500 rounded-full"
                              style={{
                                left: '-6px',
                                top: '-6px',
                                width: '12px',
                                height: '12px',
                                zIndex: 30,
                              }}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleMouseDown(e, text.id, 'move');
                              }}
                            />

                            {/* Resize Handle (bottom-right) */}
                            <div
                              className="absolute cursor-nwse-resize bg-purple-500 rounded-full"
                              style={{
                                right: '-6px',
                                bottom: '-6px',
                                width: '12px',
                                height: '12px',
                                zIndex: 30,
                              }}
                              onMouseDown={(e) => handleMouseDown(e, text.id, 'resize')}
                            />

                            {/* Rotate Handle (top-center) */}
                            <div
                              className="absolute cursor-grab bg-purple-500 rounded-full"
                              style={{
                                left: '50%',
                                top: '-20px',
                                transform: 'translateX(-50%)',
                                width: '12px',
                                height: '12px',
                                zIndex: 30,
                              }}
                              onMouseDown={(e) => handleMouseDown(e, text.id, 'rotate')}
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                Upload an image to see preview
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="space-y-6">
        {/* Animation Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <h3 className="text-lg font-semibold mb-4">Animation</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Animation Type</label>
              <select
                value={animation.type}
                onChange={(e) => setAnimation({ ...animation, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="none">None (Static)</option>
                <option value="zoom">Zoom In/Out</option>
                <option value="pan">Pan/Scroll</option>
                <option value="fade">Fade In/Out</option>
                <option value="bounce">Bounce</option>
                <option value="rotate">Rotate</option>
                <option value="pulse">Pulse</option>
                <option value="shake">Shake</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Duration: {animation.duration}s
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={animation.duration}
                onChange={(e) => setAnimation({ ...animation, duration: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Frame Rate (FPS)</label>
              <select
                value={animation.frameRate}
                onChange={(e) => setAnimation({ ...animation, frameRate: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <option value="10">10 FPS</option>
                <option value="15">15 FPS</option>
                <option value="20">20 FPS</option>
                <option value="24">24 FPS</option>
                <option value="30">30 FPS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Loop Count</label>
              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={animation.loopCount === 0}
                    onChange={(e) => {
                      setAnimation({ ...animation, loopCount: e.target.checked ? 0 : 1 });
                    }}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Infinite Loop</span>
                </label>
              </div>
              <input
                type="number"
                min="0"
                value={animation.loopCount === 0 ? '' : animation.loopCount}
                onChange={(e) => setAnimation({ ...animation, loopCount: parseInt(e.target.value) || 0 })}
                disabled={animation.loopCount === 0}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter number of loops"
              />
              {animation.loopCount === 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">∞ Infinite loop enabled</p>
              )}
            </div>
          </div>
        </div>

        {/* Text Overlays */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Text Overlays</h3>
            <button
              onClick={addTextOverlay}
              className="px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm transition-colors"
            >
              + Add Text
            </button>
          </div>

          {textOverlays.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No text overlays added</p>
          ) : (
            <div className="space-y-3">
              {textOverlays.map((text) => (
                <div
                  key={text.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedTextId === text.id
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  onClick={() => setSelectedTextId(text.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-sm">{text.text || 'Empty text'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTextOverlay(text.id);
                      }}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      ×
                    </button>
                  </div>
                  {selectedTextId === text.id && (
                    <div className="space-y-2 mt-2">
                      <input
                        type="text"
                        value={text.text}
                        onChange={(e) => updateTextOverlay(text.id, { text: e.target.value })}
                        placeholder="Enter text"
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">X (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(text.x)}
                            onChange={(e) => updateTextOverlay(text.id, { x: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Y (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(text.y)}
                            onChange={(e) => updateTextOverlay(text.id, { y: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Font Size</label>
                          <input
                            type="number"
                            min="8"
                            max="200"
                            value={text.fontSize}
                            onChange={(e) => updateTextOverlay(text.id, { fontSize: parseInt(e.target.value) || 12 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Color</label>
                          <input
                            type="color"
                            value={text.color}
                            onChange={(e) => updateTextOverlay(text.id, { color: e.target.value })}
                            className="w-full h-8 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Width (%)</label>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={Math.round(text.width || 30)}
                            onChange={(e) => updateTextOverlay(text.id, { width: parseFloat(e.target.value) || 30 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Height (%)</label>
                          <input
                            type="number"
                            min="5"
                            max="100"
                            value={Math.round(text.height || 10)}
                            onChange={(e) => updateTextOverlay(text.id, { height: parseFloat(e.target.value) || 10 })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Rotation (°)</label>
                        <input
                          type="number"
                          min="-360"
                          max="360"
                          value={Math.round(text.rotation || 0)}
                          onChange={(e) => updateTextOverlay(text.id, { rotation: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <select
                        value={text.fontFamily}
                        onChange={(e) => updateTextOverlay(text.id, { fontFamily: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Comic Sans MS">Comic Sans MS</option>
                        <option value="Impact">Impact</option>
                      </select>
                      <select
                        value={text.textAlign}
                        onChange={(e) => updateTextOverlay(text.id, { textAlign: e.target.value as any })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                      <select
                        value={text.textAnimation || 'none'}
                        onChange={(e) => updateTextOverlay(text.id, { textAnimation: e.target.value as any })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="none">No Animation</option>
                        <option value="fade">Fade</option>
                        <option value="slide">Slide</option>
                        <option value="bounce">Bounce</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
