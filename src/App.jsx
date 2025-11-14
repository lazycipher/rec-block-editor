import { Routes, Route, useParams, useNavigate } from "react-router-dom";
import { EditorProvider, useEditor } from "./context/EditorContext";
import TabBar from "./components/TabBar";
import Editor from "./components/Editor";
import SplitView from "./components/SplitView";
import FloatingReferenceWindow from "./components/FloatingReferenceWindow";
import { useEffect } from "react";

const AppContent = () => {
  const { activeTab, splitView, setActiveTab } = useEditor();
  const navigate = useNavigate();
  const location = window.location.pathname;

  useEffect(() => {
    if (activeTab && !location.includes(`/doc/${activeTab}`)) {
      navigate(`/doc/${activeTab}`, { replace: true });
    }
  }, [activeTab, navigate, location]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <TabBar />
      <Routes>
        <Route
          path="/doc/:docId"
          element={
            <DocumentRoute setActiveTab={setActiveTab} splitView={splitView} />
          }
        />
        <Route
          path="/"
          element={<DefaultRoute setActiveTab={setActiveTab} />}
        />
      </Routes>
      <FloatingReferenceWindow />
    </div>
  );
};

const DocumentRoute = () => {
  const { splitView, setSplitView, setActiveTab } = useEditor();
  const { docId } = useParams();
  const { documents } = useEditor();

  useEffect(() => {
    if (docId && documents[docId]) {
      setActiveTab(docId);
    }
  }, [docId, documents, setActiveTab]);

  if (!documents[docId]) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Document not found</div>
      </div>
    );
  }

  return splitView ? (
    <div className="flex-1 overflow-scroll relative">
      <button
        onClick={() => setSplitView(!splitView)}
        className={`px-4 py-3 text-sm rounded-xl cursor-pointer absolute bottom-2 left-2 ${
          splitView
            ? "bg-indigo-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {splitView ? "Exit Split View" : "Split View"}
      </button>
      <SplitView />
    </div>
  ) : (
    <div className="flex-1 overflow-scroll relative">
      <button
        onClick={() => setSplitView(!splitView)}
        className={`px-4 py-3 text-sm rounded-xl cursor-pointer absolute bottom-2 left-2 ${
          splitView
            ? "bg-indigo-500 text-white"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {splitView ? "Exit Split View" : "Split View"}
      </button>
      <Editor docId={docId} />
    </div>
  );
};

const DefaultRoute = () => {
  const { documents, tabs } = useEditor();
  const navigate = useNavigate();

  useEffect(() => {
    if (tabs.length > 0 && tabs[0]) {
      navigate(`/doc/${tabs[0]}`, { replace: true });
    } else if (Object.keys(documents).length > 0) {
      const firstDocId = Object.keys(documents)[0];
      navigate(`/doc/${firstDocId}`, { replace: true });
    }
  }, [tabs, documents, navigate]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );
};

function App() {
  return (
    <EditorProvider>
      <AppContent />
    </EditorProvider>
  );
}

export default App;
