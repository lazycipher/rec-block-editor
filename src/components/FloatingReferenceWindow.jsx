import { useEditor } from '../context/EditorContext';
import Editor from './Editor';

const FloatingReferenceWindow = () => {
  const { floatingWindow, closeFloatingWindow } = useEditor();

  if (!floatingWindow) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black bg-opacity-20 pointer-events-auto" onClick={closeFloatingWindow} />
      <div
        className="relative bg-white rounded-lg shadow-2xl w-[600px] h-[500px] flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-300">
          <h2 className="text-lg font-semibold">Reference</h2>
          <button
            onClick={closeFloatingWindow}
            className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-gray-800"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-scroll">
          <Editor docId={floatingWindow} isReference={true} />
        </div>
      </div>
    </div>
  );
};

export default FloatingReferenceWindow;

