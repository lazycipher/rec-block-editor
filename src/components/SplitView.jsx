import { useEditor } from '../context/EditorContext';
import Editor from './Editor';

const SplitView = () => {
  const { activeTab, splitView, setSplitView, floatingWindow } = useEditor();

  if (!splitView) return null;

  const referenceDocId = floatingWindow || activeTab;

  return (
    <div className="flex-1 flex border-t border-gray-300">
      <div className="flex-1 border-r border-gray-300 overflow-hidden">
        <Editor docId={activeTab} />
      </div>
      <div className="flex-1 overflow-hidden bg-gray-50">
        <div className="p-4 border-b border-gray-300 bg-white">
          <h2 className="text-lg font-semibold">Reference</h2>
        </div>
        <Editor docId={referenceDocId} isReference={true} />
      </div>
    </div>
  );
};

export default SplitView;

