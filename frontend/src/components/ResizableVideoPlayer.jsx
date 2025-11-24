import React, { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

const ResizableVideoPlayer = ({ videoUrl, onClose }) => {
  const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 20 });
  const [size, setSize] = useState({ width: 400, height: 225 }); // 16:9 ratio
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Handle dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.video-controls') || e.target.tagName === 'VIDEO') return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, resizeStart.width + (e.clientX - resizeStart.x));
      const newHeight = newWidth * 9 / 16; // Maintain 16:9 ratio
      setSize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragOffset, resizeStart]);

  // Handle resize corner
  const handleResizeStart = (e) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    } else {
      setPosition({ x: window.innerWidth - 420, y: 20 });
      setSize({ width: 400, height: 225 });
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-gray-900 rounded-lg shadow-2xl overflow-hidden border-2 border-gray-700"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height + 40}px`, // +40 for header
        cursor: isDragging ? 'grabbing' : 'default',
        transition: isFullscreen ? 'all 0.3s ease' : 'none'
      }}
    >
      {/* Header - Draggable */}
      <div
        className="h-10 bg-gray-800 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <span className="text-white text-sm font-medium">📹 Tutorial Video</span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1 hover:bg-gray-700 rounded transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-600 rounded transition"
            title="Close video"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Video Player */}
      <div className="relative bg-black" style={{ height: `${size.height}px` }}>
        <video
          ref={videoRef}
          className="w-full h-full video-controls"
          controls
          controlsList="nodownload"
          src={videoUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Resize Handle - Bottom Right Corner */}
      {!isFullscreen && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
          onMouseDown={handleResizeStart}
          style={{
            background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.3) 50%)'
          }}
        />
      )}
    </div>
  );
};

export default ResizableVideoPlayer;
