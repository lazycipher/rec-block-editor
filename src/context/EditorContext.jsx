import { createContext, useContext, useState, useEffect } from 'react';

const EditorContext = createContext();

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children }) => {
  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('recon-editor-documents');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      'doc-1': {
        id: 'doc-1',
        title: '',
        blocks: [],
      },
    };
  });

  const [tabs, setTabs] = useState(() => {
    const saved = localStorage.getItem('recon-editor-tabs');
    if (saved) {
      return JSON.parse(saved);
    }
    return ['doc-1'];
  });
  const [activeTab, setActiveTab] = useState('doc-1');

  useEffect(() => {
    const allDocIds = Object.keys(documents);
    if (allDocIds.length > 0) {
      setTabs((prev) => {
        const newDocIds = allDocIds.filter((id) => !prev.includes(id));
        if (newDocIds.length > 0) {
          return [...prev, ...newDocIds];
        }
        return prev;
      });
    }
  }, [documents]);
  const [splitView, setSplitView] = useState(false);
  const [floatingWindow, setFloatingWindow] = useState(null);

  useEffect(() => {
    localStorage.setItem('recon-editor-documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('recon-editor-tabs', JSON.stringify(tabs));
  }, [tabs]);

  const createDocument = (title = 'Untitled') => {
    const id = `doc-${Date.now()}`;
    const newDoc = {
      id,
      title,
      blocks: [],
    };
    setDocuments((prev) => ({ ...prev, [id]: newDoc }));
    setTabs((prev) => {
      if (!prev.includes(id)) {
        return [...prev, id];
      }
      return prev;
    });
    setActiveTab(id);
    return id;
  };

  const updateDocument = (docId, updates) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: { ...prev[docId], ...updates },
    }));
  };

  const updateBlock = (docId, blockId, updates) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        blocks: prev[docId].blocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        ),
      },
    }));
  };

  const addBlock = (docId, afterBlockId, newBlock) => {
    setDocuments((prev) => {
      const blocks = [...prev[docId].blocks];
      const index = blocks.findIndex((b) => b.id === afterBlockId);
      blocks.splice(index + 1, 0, newBlock);
      return {
        ...prev,
        [docId]: { ...prev[docId], blocks },
      };
    });
  };

  const deleteBlock = (docId, blockId) => {
    setDocuments((prev) => ({
      ...prev,
      [docId]: {
        ...prev[docId],
        blocks: prev[docId].blocks.filter((b) => b.id !== blockId),
      },
    }));
  };

  const closeTab = (tabId) => {
    const allDocs = Object.keys(documents);
    if (allDocs.length <= 1) return;
    
    let nextActiveTab = null;
    if (activeTab === tabId) {
      const currentTabs = tabs.filter((id) => id !== tabId);
      if (currentTabs.length > 0) {
        nextActiveTab = currentTabs[0];
      } else {
        const remainingDocs = allDocs.filter((id) => id !== tabId);
        if (remainingDocs.length > 0) {
          nextActiveTab = remainingDocs[0];
        }
      }
    }
    
    setDocuments((prev) => {
      const newDocs = { ...prev };
      delete newDocs[tabId];
      return newDocs;
    });
    
    setTabs((prev) => prev.filter((id) => id !== tabId));
    
    if (nextActiveTab) {
      setActiveTab(nextActiveTab);
    }
  };

  const openDocument = (docId, inNewTab = false) => {
    if (inNewTab) {
      if (!tabs.includes(docId)) {
        setTabs((prev) => [...prev, docId]);
      }
      setActiveTab(docId);
    } else {
      setFloatingWindow(docId);
    }
  };

  const closeFloatingWindow = () => {
    setFloatingWindow(null);
  };

  const getDocumentByTitle = (title) => {
    return Object.values(documents).find((doc) => doc.title === title);
  };

  const getAllDocumentTitles = () => {
    return Object.values(documents).map((doc) => doc.title);
  };

  return (
    <EditorContext.Provider
      value={{
        documents,
        tabs,
        activeTab,
        splitView,
        floatingWindow,
        setActiveTab,
        setSplitView,
        createDocument,
        updateDocument,
        updateBlock,
        addBlock,
        deleteBlock,
        closeTab,
        openDocument,
        closeFloatingWindow,
        getDocumentByTitle,
        getAllDocumentTitles,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

