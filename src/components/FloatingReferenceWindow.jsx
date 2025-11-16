import { useRef, useEffect, useState } from "react";
import Draggable from "react-draggable";
import { useEditor } from "../context/EditorContext";
import Editor from "./Editor";

const FloatingReferenceWindow = () => {
  const { floatingWindow, closeFloatingWindow } = useEditor();
  const [defaultPosition, setDefaultPosition] = useState({ x: 0, y: 0 });
  const [bounds, setBounds] = useState({ left: 0, top: 0, right: 0, bottom: 0 });
  const nodeRef = useRef(null);

  // Calculate initial centered position and bounds
  useEffect(() => {
    if (!floatingWindow || !nodeRef.current) return;

    const updatePositionAndBounds = () => {
      if (!nodeRef.current) return;
      
      const rect = nodeRef.current.getBoundingClientRect();
      const windowWidth = rect.width;
      const windowHeight = rect.height;
      
      // Center the window
      const centerX = (window.innerWidth - windowWidth) / 2;
      const centerY = (window.innerHeight - windowHeight) / 2;
      
      setDefaultPosition({
        x: Math.max(0, Math.min(centerX, window.innerWidth - windowWidth)),
        y: Math.max(0, Math.min(centerY, window.innerHeight - windowHeight)),
      });
      
      // Set bounds to keep window within viewport
      // Header should be visible (y >= 0), and window shouldn't go beyond edges
      setBounds({
        left: 0,
        top: 0,
        right: window.innerWidth - windowWidth,
        bottom: window.innerHeight - windowHeight,
      });
    };

    // Use setTimeout to ensure the element is rendered and has dimensions
    const timeoutId = setTimeout(updatePositionAndBounds, 0);
    
    // Update on window resize
    window.addEventListener('resize', updatePositionAndBounds);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updatePositionAndBounds);
    };
  }, [floatingWindow]);

  if (!floatingWindow) return null;

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <Draggable
        key={floatingWindow}
        nodeRef={nodeRef}
        handle=".drag-handle"
        defaultPosition={defaultPosition}
        bounds={bounds}
      >
        <div
          ref={nodeRef}
          className="absolute border border-indigo-100 bg-white rounded-lg shadow-2xl shadow-indigo-200 w-[600px] h-[500px] flex flex-col pointer-events-auto"
        >
          <div className="drag-handle flex items-center justify-between p-4 border-b border-gray-300 cursor-grab active:cursor-grabbing select-none">
            <h2 className="text-lg font-semibold">Reference</h2>
            <button
              onClick={closeFloatingWindow}
              className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
              title="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-scroll">
            <Editor docId={floatingWindow} isReference={true} />
          </div>
        </div>
      </Draggable>
    </div>
  );
};

export default FloatingReferenceWindow;
