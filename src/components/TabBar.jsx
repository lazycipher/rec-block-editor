import { useEditor } from "../context/EditorContext";
import { useNavigate } from "react-router-dom";

const TabBar = () => {
  const { tabs, activeTab, setActiveTab, closeTab, documents, createDocument } =
    useEditor();
  const navigate = useNavigate();

  const allDocumentIds =
    Object.keys(documents).length > 0 ? Object.keys(documents) : tabs;

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/doc/${tabId}`);
  };

  const handleCreateDocument = () => {
    const newDocId = createDocument();
    navigate(`/doc/${newDocId}`);
  };

  return (
    <div className="flex items-center bg-gray-100 border-b border-gray-300 overflow-x-auto">
      {allDocumentIds.map((tabId) => {
        const doc = documents[tabId];
        if (!doc) return null;
        return (
          <div
            key={tabId}
            className={`
              flex items-center gap-2 px-4 py-2 border-r border-gray-300 cursor-pointer
              ${
                activeTab === tabId
                  ? "bg-white border-b-2 border-b-indigo-500"
                  : "bg-gray-50 hover:bg-gray-200"
              }
            `}
            onClick={() => handleTabClick(tabId)}
          >
            <span className="text-sm font-medium whitespace-nowrap">
              {doc.title || "Untitled"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tabId);
              }}
              className="hover:bg-red-300 rounded p-0.5 text-gray-600 hover:text-red-800 cursor-pointer"
              title="Close tab"
            >
              <svg
                width="14"
                height="14"
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
        );
      })}
      <button
        onClick={handleCreateDocument}
        className="px-4 py-2 text-sm font-medium bg-indigo-500 text-white cursor-pointer hover:bg-indigo-700"
        title="New document"
      >
        +
      </button>
    </div>
  );
};

export default TabBar;
