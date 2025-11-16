import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor } from "../context/EditorContext";
import BlockRenderer from "./BlockRenderer";

const Editor = ({ docId, isReference = false }) => {
  const { documents, addBlock, updateDocument, updateBlock } = useEditor();
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [commandPosition, setCommandPosition] = useState({ top: 0, left: 0 });
  const [commandQuery, setCommandQuery] = useState("");
  const [targetBlockId, setTargetBlockId] = useState(null);
  const [autoFocusBlockId, setAutoFocusBlockId] = useState(null);
  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [showLinkTypeMenu, setShowLinkTypeMenu] = useState(false);
  const [linkMenuPosition, setLinkMenuPosition] = useState({ top: 0, left: 0 });
  const [linkTargetBlockId, setLinkTargetBlockId] = useState(null);
  const [selectedLinkTypeIndex, setSelectedLinkTypeIndex] = useState(0);
  const editorRef = useRef(null);
  const commandMenuRef = useRef(null);
  const linkMenuRef = useRef(null);

  const doc = documents[docId];

  const commands = [
    { id: "header1", label: "Heading 1", type: "header", level: 1 },
    { id: "header2", label: "Heading 2", type: "header", level: 2 },
    { id: "header3", label: "Heading 3", type: "header", level: 3 },
    { id: "bullet", label: "Bullet List", type: "bullet-list" },
    { id: "code", label: "Code Block", type: "code" },
    { id: "checkbox", label: "Checkbox", type: "checkbox" },
    { id: "link", label: "Link", type: "link" },
    { id: "paragraph", label: "Paragraph", type: "paragraph" },
  ];

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(commandQuery.toLowerCase())
  );

  const createBlockFromCommand = useCallback(
    (afterBlockId, command) => {
      if (command.type === "link") {
        setShowCommandMenu(false);
        setLinkTargetBlockId(afterBlockId);
        setSelectedLinkTypeIndex(0);
        const blockElement = document.querySelector(
          `[data-block-id="${afterBlockId}"]`
        );
        if (blockElement) {
          const rect = blockElement.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          const scrollX = window.scrollX || window.pageXOffset;
          setLinkMenuPosition({
            top: rect.bottom + scrollY + 5,
            left: rect.left + scrollX,
          });
        } else {
          setLinkMenuPosition({ top: 100, left: 100 });
        }
        setShowLinkTypeMenu(true);
        return;
      }

      const targetBlock = documents[docId]?.blocks.find(
        (b) => b.id === afterBlockId
      );
      const currentContent = targetBlock?.content || "";

      if (targetBlock) {
        const updates = {
          type: command.type,
          ...(command.level && { level: command.level }),
          ...(command.type === "checkbox" && { checked: false }),
          content: currentContent.replace(/^\/\s*/, ""),
        };
        if (command.type !== "header" && targetBlock.level) {
          delete updates.level;
        }
        updateBlock(docId, afterBlockId, updates);
        setAutoFocusBlockId(afterBlockId);
      } else {
        const newBlock = {
          id: `block-${Date.now()}-${Math.random()}`,
          type: command.type,
          content: "",
          ...(command.level && { level: command.level }),
          ...(command.type === "checkbox" && { checked: false }),
        };
        if (afterBlockId) {
          addBlock(docId, afterBlockId, newBlock);
        } else {
          updateDocument(docId, {
            blocks: [...(documents[docId]?.blocks || []), newBlock],
          });
        }
        setAutoFocusBlockId(newBlock.id);
      }

      setShowCommandMenu(false);
      setCommandQuery("");
      setSelectedCommandIndex(0);
    },
    [docId, documents, addBlock, updateBlock, updateDocument]
  );

  const handleSlashCommand = (blockId) => {
    const blockElement = document.querySelector(`[data-block-id="${blockId}"]`);
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      const scrollY = window.scrollY || window.pageYOffset;
      const scrollX = window.scrollX || window.pageXOffset;
      setCommandPosition({
        top: rect.bottom + scrollY + 5,
        left: rect.left + scrollX,
      });
    } else {
      setCommandPosition({ top: 100, left: 100 });
    }
    setTargetBlockId(blockId);
    setShowCommandMenu(true);
    setCommandQuery("");
    setSelectedCommandIndex(0);
  };

  const handleEnter = (blockId, afterCursor = "", beforeCursor = "") => {
    const currentBlock = documents[docId]?.blocks.find((b) => b.id === blockId);
    if (!currentBlock) return;
    
    const blockType = currentBlock.type || "paragraph";

    // Update current block to ensure it only contains content before cursor
    // This is a safety measure in case BlockRenderer's update hasn't applied yet
    updateBlock(docId, blockId, { content: beforeCursor });

    const newBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type: blockType,
      content: afterCursor,
      ...(currentBlock?.level && { level: currentBlock.level }),
      ...(blockType === "checkbox" && { checked: false }),
    };
    addBlock(docId, blockId, newBlock);
    setAutoFocusBlockId(newBlock.id);
  };

  const handleArrowDown = (blockId) => {
    const blocks = documents[docId]?.blocks || [];
    const currentIndex = blocks.findIndex((b) => b.id === blockId);
    if (currentIndex < blocks.length - 1) {
      const nextBlockId = blocks[currentIndex + 1].id;
      setAutoFocusBlockId(nextBlockId);
    }
  };

  const handleArrowUp = (blockId) => {
    const blocks = documents[docId]?.blocks || [];
    const currentIndex = blocks.findIndex((b) => b.id === blockId);
    if (currentIndex > 0) {
      const prevBlockId = blocks[currentIndex - 1].id;
      setAutoFocusBlockId(prevBlockId);
    }
  };

  const handleDeleteBlock = (blockId) => {
    setAutoFocusBlockId(blockId);
  };

  const handleLinkTypeSelect = useCallback(
    (linkType) => {
      const targetBlock = documents[docId]?.blocks.find(
        (b) => b.id === linkTargetBlockId
      );

      const updates = {
        type: "link",
        linkType: linkType,
        linkValue: "",
        content: "",
      };

      if (targetBlock) {
        updateBlock(docId, linkTargetBlockId, updates);
        setAutoFocusBlockId(linkTargetBlockId);
      } else {
        const newBlock = {
          id: `block-${Date.now()}-${Math.random()}`,
          type: "link",
          linkType: linkType,
          linkValue: "",
          content: "",
        };
        if (linkTargetBlockId) {
          addBlock(docId, linkTargetBlockId, newBlock);
        } else {
          updateDocument(docId, {
            blocks: [...(documents[docId]?.blocks || []), newBlock],
          });
        }
        setAutoFocusBlockId(newBlock.id);
      }

      setShowLinkTypeMenu(false);
      setLinkTargetBlockId(null);
      setSelectedLinkTypeIndex(0);
    },
    [docId, documents, linkTargetBlockId, updateBlock, addBlock, updateDocument]
  );

  const handleTitleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newBlock = {
        id: `block-${Date.now()}-${Math.random()}`,
        type: "paragraph",
        content: "",
      };

      if (doc.blocks.length === 0) {
        updateDocument(docId, { blocks: [newBlock] });
      } else {
        updateDocument(docId, {
          blocks: [newBlock, ...doc.blocks],
        });
      }

      setAutoFocusBlockId(newBlock.id);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (doc.blocks.length > 0) {
        setAutoFocusBlockId(doc.blocks[0].id);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showLinkTypeMenu) {
        e.stopPropagation();

        const linkTypes = ["page", "url"];

        if (e.key === "Escape") {
          e.preventDefault();
          setShowLinkTypeMenu(false);
          setLinkTargetBlockId(null);
          setSelectedLinkTypeIndex(0);
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selectedType = linkTypes[selectedLinkTypeIndex] || linkTypes[0];
          handleLinkTypeSelect(selectedType);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedLinkTypeIndex((prev) =>
            prev < linkTypes.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedLinkTypeIndex((prev) =>
            prev > 0 ? prev - 1 : linkTypes.length - 1
          );
        }
      } else if (showCommandMenu) {
        e.stopPropagation();

        if (e.key === "Escape") {
          e.preventDefault();
          setShowCommandMenu(false);
          setCommandQuery("");
          setSelectedCommandIndex(0);
        } else if (e.key === "Enter" && filteredCommands.length > 0) {
          e.preventDefault();
          const selectedCommand =
            filteredCommands[selectedCommandIndex] || filteredCommands[0];
          createBlockFromCommand(targetBlockId, selectedCommand);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedCommandIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else if (e.key === "Backspace") {
          if (commandQuery.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            setCommandQuery((prev) => prev.slice(0, -1));
          }
        } else if (
          e.key.length === 1 &&
          !e.metaKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.stopPropagation();
          setCommandQuery((prev) => prev + e.key);
          setSelectedCommandIndex(0);
        }
      }
    };

    if (showCommandMenu || showLinkTypeMenu) {
      document.addEventListener("keydown", handleKeyDown, true);
      return () => document.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [
    showCommandMenu,
    showLinkTypeMenu,
    filteredCommands,
    targetBlockId,
    commandQuery,
    selectedCommandIndex,
    selectedLinkTypeIndex,
    createBlockFromCommand,
    handleLinkTypeSelect,
  ]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        commandMenuRef.current &&
        !commandMenuRef.current.contains(e.target)
      ) {
        setShowCommandMenu(false);
        setCommandQuery("");
        setSelectedCommandIndex(0);
      }
      if (linkMenuRef.current && !linkMenuRef.current.contains(e.target)) {
        setShowLinkTypeMenu(false);
        setLinkTargetBlockId(null);
      }
    };
    if (showCommandMenu || showLinkTypeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showCommandMenu, showLinkTypeMenu]);

  return (
    <div
      ref={editorRef}
      className="flex-1 grow overflow-scroll p-8 max-w-4xl mx-auto"
    >
      {!isReference && (
        <input
          type="text"
          value={doc.title}
          onChange={(e) => updateDocument(docId, { title: e.target.value })}
          onKeyDown={handleTitleKeyDown}
          className="text-4xl font-bold mb-8 w-full border-none outline-none bg-transparent placeholder:text-gray-400"
          placeholder="Untitled"
        />
      )}
      {isReference && (
        <h1 className="text-2xl font-bold mb-4 border-b pb-2">{doc.title}</h1>
      )}
      <div className="space-y-1 grow overflow-scroll">
        {doc.blocks.length === 0 ? (
          <div
            className="text-gray-400 italic cursor-text py-2"
            onClick={() => {
              const newBlock = {
                id: `block-${Date.now()}-${Math.random()}`,
                type: "paragraph",
                content: "",
              };
              updateDocument(docId, { blocks: [newBlock] });
            }}
          >
            Click here to start writing, or type "/" for commands...
          </div>
        ) : (
          <>
            {doc.blocks.map((block) => (
              <div key={block.id} data-block-id={block.id}>
                <BlockRenderer
                  block={block}
                  docId={docId}
                  isFloating={isReference}
                  onEnter={handleEnter}
                  onSlash={handleSlashCommand}
                  onArrowDown={handleArrowDown}
                  onArrowUp={handleArrowUp}
                  onDeleteBlock={handleDeleteBlock}
                  autoFocus={autoFocusBlockId === block.id}
                  onFocusComplete={() => setAutoFocusBlockId(null)}
                />
              </div>
            ))}
            {!isReference && (
              <div
                className="min-h-[100px] cursor-text"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    const newBlock = {
                      id: `block-${Date.now()}-${Math.random()}`,
                      type: "paragraph",
                      content: "",
                    };
                    const lastBlockId = doc.blocks[doc.blocks.length - 1]?.id;
                    if (lastBlockId) {
                      addBlock(docId, lastBlockId, newBlock);
                    } else {
                      updateDocument(docId, {
                        blocks: [...doc.blocks, newBlock],
                      });
                    }
                    setAutoFocusBlockId(newBlock.id);
                  }
                }}
              />
            )}
          </>
        )}
      </div>
      {showCommandMenu && (
        <div
          ref={commandMenuRef}
          className="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50 min-w-[240px] max-h-[300px] overflow-y-auto"
          style={{
            top: `${commandPosition.top}px`,
            left: `${commandPosition.left}px`,
            maxWidth: "90vw",
          }}
        >
          {filteredCommands.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
                {commandQuery
                  ? `Filtering: "${commandQuery}"`
                  : "Choose a block type"}
              </div>
              {filteredCommands.map((cmd, index) => (
                <div
                  key={cmd.id}
                  className={`px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                    index === selectedCommandIndex ? "bg-blue-50" : ""
                  }`}
                  onClick={() => createBlockFromCommand(targetBlockId, cmd)}
                  ref={(el) => {
                    if (el && index === selectedCommandIndex) {
                      el.scrollIntoView({
                        block: "nearest",
                        behavior: "smooth",
                      });
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.parentElement
                      ?.querySelectorAll("div")
                      .forEach((el) => {
                        if (
                          el !== e.currentTarget &&
                          el.classList.contains("bg-blue-50")
                        ) {
                          el.classList.remove("bg-blue-50");
                        }
                      });
                    if (!e.currentTarget.classList.contains("bg-blue-50")) {
                      e.currentTarget.classList.add("bg-blue-50");
                    }
                  }}
                >
                  <div className="font-medium text-gray-900">{cmd.label}</div>
                  {cmd.type === "header" && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      {cmd.level === 1
                        ? "Large heading"
                        : cmd.level === 2
                        ? "Medium heading"
                        : "Small heading"}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="px-4 py-2 text-gray-500">
              No commands found for "{commandQuery}"
            </div>
          )}
        </div>
      )}
      {showLinkTypeMenu && (
        <div
          ref={linkMenuRef}
          className="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50 min-w-[240px]"
          style={{
            top: `${linkMenuPosition.top}px`,
            left: `${linkMenuPosition.left}px`,
            maxWidth: "90vw",
          }}
        >
          <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
            Choose link type
          </div>
          <div
            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
              selectedLinkTypeIndex === 0 ? "bg-blue-50" : ""
            }`}
            onClick={() => handleLinkTypeSelect("page")}
            onMouseEnter={() => setSelectedLinkTypeIndex(0)}
          >
            <div className="font-medium text-gray-900">Link Page</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Link to an existing page
            </div>
          </div>
          <div
            className={`px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
              selectedLinkTypeIndex === 1 ? "bg-blue-50" : ""
            }`}
            onClick={() => handleLinkTypeSelect("url")}
            onMouseEnter={() => setSelectedLinkTypeIndex(1)}
          >
            <div className="font-medium text-gray-900">URL</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Link to an external URL
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Editor;
