import { useState, useRef, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';
import { parseLinks } from '../utils/linkParser';

const InternalLink = ({ linkText, onLinkClick }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    onLinkClick(linkText, e.metaKey || e.ctrlKey);
  };

  return (
    <span
      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
      onClick={handleClick}
      contentEditable={false}
      suppressContentEditableWarning
    >
      [[{linkText}]]
    </span>
  );
};

const BlockRenderer = ({ block, docId, isFloating = false, onEnter, onSlash, onArrowDown, onArrowUp, onDeleteBlock, autoFocus = false, onFocusComplete }) => {
  const { updateBlock, deleteBlock, openDocument, getDocumentByTitle, createDocument, getAllDocumentTitles, documents } = useEditor();
  const [showPageSelector, setShowPageSelector] = useState(false);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const pageSelectorRef = useRef(null);
  
  const shouldShowPageSelector = block.type === 'link' && block.linkType === 'page' && !block.linkValue && !isFloating;
  const editableRef = useRef(null);
  const isComposingRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleInternalLinkClick = (linkText, inNewTab) => {
    let doc = getDocumentByTitle(linkText);
    if (!doc) {
      const newDocId = createDocument(linkText);
      doc = { id: newDocId };
    }
    if (doc) {
      if (inNewTab) {
        const url = `${window.location.origin}/doc/${doc.id}`;
        window.open(url, '_blank');
      } else {
        openDocument(doc.id, false);
      }
    }
  };

  useEffect(() => {
    if (!shouldShowPageSelector && !showPageSelector) return;
    
    const pageTitles = getAllDocumentTitles();
    
    const handleKeyDown = (e) => {
      e.stopPropagation();
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowPageSelector(false);
        setSelectedPageIndex(0);
      } else if (e.key === 'Enter' && pageTitles.length > 0) {
        e.preventDefault();
        const selectedTitle = pageTitles[selectedPageIndex] || pageTitles[0];
        updateBlock(docId, block.id, { linkValue: selectedTitle, content: selectedTitle });
        setShowPageSelector(false);
        setSelectedPageIndex(0);
        setIsFocused(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedPageIndex((prev) => 
          prev < pageTitles.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedPageIndex((prev) => 
          prev > 0 ? prev - 1 : pageTitles.length - 1
        );
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [shouldShowPageSelector, showPageSelector, selectedPageIndex, docId, block.id, updateBlock, getAllDocumentTitles]);

  useEffect(() => {
    if (!autoFocus) return;
    
    const focusBlock = (attempts = 0) => {
      if (attempts > 20) {
        if (onFocusComplete) {
          onFocusComplete();
        }
        return;
      }
      
      if (editableRef.current) {
        const isEditable = editableRef.current.contentEditable === 'true' || 
                          (editableRef.current.contentEditable !== 'false' && 
                           editableRef.current.getAttribute('contenteditable') !== 'false');
        
        if (isEditable) {
          const hasFocus = document.activeElement === editableRef.current;
          
          if (block.type === 'code') {
            editableRef.current.setAttribute('dir', 'ltr');
            editableRef.current.style.direction = 'ltr';
            editableRef.current.style.unicodeBidi = 'embed';
          }
          
          if (!hasFocus) {
            editableRef.current.focus();
          }
          
          const range = document.createRange();
          const selection = window.getSelection();
          
          let textNode = editableRef.current.firstChild;
          while (textNode && textNode.nodeType !== Node.TEXT_NODE && textNode.firstChild) {
            textNode = textNode.firstChild;
          }
          
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            range.setStart(textNode, textNode.textContent.length);
            range.setEnd(textNode, textNode.textContent.length);
          } else {
            if (editableRef.current.childNodes.length === 0) {
              const text = document.createTextNode('');
              editableRef.current.appendChild(text);
              range.setStart(text, 0);
              range.setEnd(text, 0);
            } else {
              range.selectNodeContents(editableRef.current);
              range.collapse(false);
            }
          }
          
          selection.removeAllRanges();
          selection.addRange(range);
          
          if (!isFocused) {
            setIsFocused(true);
          }
          
          if (onFocusComplete) {
            onFocusComplete();
          }
          return;
        }
      }
      
      setTimeout(() => focusBlock(attempts + 1), 10);
    };
    
    requestAnimationFrame(() => {
      focusBlock();
    });
  }, [autoFocus, isFocused, onFocusComplete, block.type]);

  // Initialize contentEditable with block content
  // Only update when not focused and when there are no React children
  useEffect(() => {
    if (!editableRef.current || isFocused) return;
    
    const currentText = editableRef.current.textContent || '';
    const blockContent = block.content || '';
    
    // Check if element has React children (links)
    const hasReactChildren = editableRef.current.children.length > 0;
    
    if (currentText !== blockContent && !hasReactChildren) {
      // Only update textContent if there are no React children
      // This prevents the removeChild error
      requestAnimationFrame(() => {
        if (editableRef.current && !isFocused && editableRef.current.children.length === 0) {
          editableRef.current.textContent = blockContent;
          // For code blocks, ensure LTR direction
          if (block.type === 'code') {
            editableRef.current.setAttribute('dir', 'ltr');
            editableRef.current.style.direction = 'ltr';
            editableRef.current.style.unicodeBidi = 'embed';
          }
        }
      });
    }
  }, [block.content, block.type, isFocused]);

  const handleInput = (e) => {
    if (isComposingRef.current) return;
    const newContent = e.currentTarget.textContent || '';
    updateBlock(docId, block.id, { content: newContent });
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = () => {
    isComposingRef.current = false;
    const newContent = editableRef.current?.textContent || '';
    updateBlock(docId, block.id, { content: newContent });
  };

  const handleKeyDown = (e) => {
    if (isComposingRef.current) return;
    
    const content = editableRef.current?.textContent || '';
    const selection = window.getSelection();
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    
    if (e.key === '/' && range) {
      const textBeforeCursor = content.substring(0, range.startOffset);
      const isEmpty = content === '';
      const isAtStart = textBeforeCursor.length === 0;
      const lastChar = textBeforeCursor[textBeforeCursor.length - 1];
      const isAfterSpaceOrNewline = lastChar === ' ' || lastChar === '\n';
      
      if (isEmpty || isAtStart || isAfterSpaceOrNewline) {
        e.preventDefault();
        const newContent = textBeforeCursor;
        updateBlock(docId, block.id, { content: newContent });
        if (onSlash) {
          onSlash(block.id, range);
        }
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const currentContent = editableRef.current?.textContent || '';
      updateBlock(docId, block.id, { content: currentContent });
      if (onEnter) {
        onEnter(block.id, '');
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      // For code blocks, allow multiline (don't create new block)
      if (block.type === 'code') {
        if (!range) return;
        
        const currentContent = editableRef.current?.textContent || '';
        const cursorOffset = range.startOffset;
        
        // Check if cursor is at the very end of the code block
        const isAtEnd = cursorOffset >= currentContent.length;
        const textAfterCursor = currentContent.substring(cursorOffset);
        const hasNewlineAfter = textAfterCursor.includes('\n');
        
        // If at the end of the last line, create a new block below
        if (isAtEnd && !hasNewlineAfter) {
          e.preventDefault();
          // Save current content
          updateBlock(docId, block.id, { content: currentContent });
          // Create new block below
          if (onEnter) {
            onEnter(block.id, '');
          }
          return;
        }
        
        // Otherwise, allow default Enter behavior (creates newline within code block)
        // Just update the content after the newline is inserted
        setTimeout(() => {
          const newContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: newContent });
        }, 0);
        return; // Don't prevent default, allow newline
      }
      
      // For all other block types (headers, paragraphs, lists, etc.), create a new block
      e.preventDefault();
      e.stopPropagation(); // Prevent any parent handlers
      
      const currentContent = editableRef.current?.textContent || '';
      const selection = window.getSelection();
      
      // Get range - try to get it from selection if not already available
      let cursorRange = range;
      if (!cursorRange && selection.rangeCount > 0) {
        cursorRange = selection.getRangeAt(0);
      }
      
      // Check if there's selected text
      const hasSelection = cursorRange && !cursorRange.collapsed;
      
      let beforeCursor = currentContent;
      let afterCursor = '';
      
      if (hasSelection) {
        // If text is selected, delete it and create new block
        cursorRange.deleteContents();
        beforeCursor = editableRef.current?.textContent || '';
        afterCursor = '';
      } else if (cursorRange) {
        // Split content at cursor position
        beforeCursor = currentContent.substring(0, cursorRange.startOffset);
        afterCursor = currentContent.substring(cursorRange.startOffset);
      }
      // If no range, beforeCursor = currentContent, afterCursor = '' (already set)
      
      // Use requestAnimationFrame to batch updates and ensure proper execution order
      requestAnimationFrame(() => {
        // Update current block with content before cursor
        updateBlock(docId, block.id, { content: beforeCursor });
        
        // Create new block below with content after cursor
        if (onEnter) {
          onEnter(block.id, afterCursor);
        }
      });
      
      return;
    }

    // Handle arrow key navigation
    if (e.key === 'ArrowDown' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      if (!range) return;
      
      const content = editableRef.current?.textContent || '';
      const cursorOffset = range.startOffset;
      
      if (block.type === 'code') {
        // For code blocks, only navigate if at the bottom-most line
        // Check if there are any newlines after the cursor
        const textAfterCursor = content.substring(cursorOffset);
        const hasNewlineAfter = textAfterCursor.includes('\n');
        
        // Navigate only if we're at the last line (no newlines after cursor)
        if (!hasNewlineAfter) {
          e.preventDefault();
          // Save current content before navigating
          const currentContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: currentContent });
          if (onArrowDown) {
            onArrowDown(block.id);
          }
          return;
        }
        // Otherwise, allow default arrow behavior to move within code block
        return;
      } else {
        // For other blocks, navigate if at the end of content
        const isAtEnd = cursorOffset >= content.length;
        if (isAtEnd) {
          e.preventDefault();
          // Save current content before navigating
          const currentContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: currentContent });
          if (onArrowDown) {
            onArrowDown(block.id);
          }
          return;
        }
      }
    }

    if (e.key === 'ArrowUp' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      if (!range) return;
      
      const content = editableRef.current?.textContent || '';
      const cursorOffset = range.startOffset;
      
      if (block.type === 'code') {
        // For code blocks, only navigate if at the top-most line
        // Check if there are any newlines before the cursor
        const textBeforeCursor = content.substring(0, cursorOffset);
        const hasNewlineBefore = textBeforeCursor.includes('\n');
        
        // Navigate only if we're at the first line (no newlines before cursor)
        if (!hasNewlineBefore) {
          e.preventDefault();
          // Save current content before navigating
          const currentContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: currentContent });
          if (onArrowUp) {
            onArrowUp(block.id);
          }
          return;
        }
        // Otherwise, allow default arrow behavior to move within code block
        return;
      } else {
        // For other blocks, navigate if at the start of content
        const isAtStart = cursorOffset === 0;
        if (isAtStart) {
          e.preventDefault();
          // Save current content before navigating
          const currentContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: currentContent });
          if (onArrowUp) {
            onArrowUp(block.id);
          }
          return;
        }
      }
    }

    // Handle select all (Cmd/Ctrl+A)
    if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }

    // Handle cut (Cmd/Ctrl+X) - allow default behavior but update content
    if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
      // Let the default cut happen, then update content
      setTimeout(() => {
        const newContent = editableRef.current?.textContent || '';
        updateBlock(docId, block.id, { content: newContent });
      }, 0);
      return;
    }

    // Handle delete/backspace with selection
    if ((e.key === 'Delete' || e.key === 'Backspace') && editableRef.current) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const selRange = selection.getRangeAt(0);
        if (!selRange.collapsed && editableRef.current.contains(selRange.commonAncestorContainer)) {
          // Text is selected within this block, delete it
          selRange.deleteContents();
          const newContent = editableRef.current?.textContent || '';
          updateBlock(docId, block.id, { content: newContent });
          e.preventDefault();
          return;
        }
      }
    }

    // Delete empty block and move to previous block
    if (e.key === 'Backspace' && content === '' && editableRef.current) {
      const doc = documents[docId];
      if (doc && doc.blocks.length > 1) {
        e.preventDefault();
        const currentIndex = doc.blocks.findIndex(b => b.id === block.id);
        const prevBlockId = currentIndex > 0 ? doc.blocks[currentIndex - 1].id : null;
        
        deleteBlock(docId, block.id);
        
        // Move focus to previous block if it exists
        if (prevBlockId && onDeleteBlock) {
          onDeleteBlock(prevBlockId);
        }
        return;
      }
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Let React handle the DOM change by re-rendering with key change
    // Then update the textContent in the next frame
    requestAnimationFrame(() => {
      if (editableRef.current) {
        const blockContent = block.content || '';
        // Only set textContent if element is empty or has text nodes
        const hasOnlyText = editableRef.current.childNodes.length === 1 && 
                          editableRef.current.firstChild?.nodeType === Node.TEXT_NODE;
        
        if (!hasOnlyText) {
          // Clear and set text
          editableRef.current.textContent = blockContent;
        } else if (editableRef.current.textContent !== blockContent) {
          editableRef.current.textContent = blockContent;
        }
        
        // For code blocks, ensure LTR direction to prevent reverse text
        if (block.type === 'code') {
          editableRef.current.setAttribute('dir', 'ltr');
          editableRef.current.style.direction = 'ltr';
          editableRef.current.style.unicodeBidi = 'embed';
        }
        
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(editableRef.current);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  const handleBlur = () => {
    setIsFocused(false);
    const newContent = editableRef.current?.textContent || '';
    updateBlock(docId, block.id, { content: newContent });
  };

  const renderLinks = () => {
    if (isFocused || isFloating) return null;
    
    const content = block.content || '';
    if (!content) return null;
    
    const parts = parseLinks(content);
    return parts.map((part, i) =>
      part.type === 'link' ? (
        <InternalLink key={i} linkText={part.content} onLinkClick={handleInternalLinkClick} />
      ) : (
        <span key={i}>{part.content}</span>
      )
    );
  };

  const baseProps = {
    ref: editableRef,
    contentEditable: !isFloating,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
    onFocus: handleFocus,
    onBlur: handleBlur,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
    'data-block-id': block.id,
    className: 'outline-none min-h-[1.5em]',
  };

  if (block.type === 'header') {
    const HeaderTag = `h${block.level || 1}`;
    const sizeClass = block.level === 1 ? 'text-3xl' : block.level === 2 ? 'text-2xl' : 'text-xl';
    return (
      <HeaderTag
        {...baseProps}
        className={`outline-none min-h-[1.5em] font-bold ${sizeClass} mb-2`}
        key={`${block.id}-${isFocused ? 'edit' : 'view'}`}
      >
        {renderLinks()}
      </HeaderTag>
    );
  }

  if (block.type === 'code') {
    return (
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto font-mono text-sm mb-2">
        <code
          {...baseProps}
          className="outline-none min-h-[1.5em] block whitespace-pre"
          spellCheck={false}
          dir="ltr"
          style={{ direction: 'ltr', unicodeBidi: 'embed' }}
        >
          {isFocused ? null : (block.content || '')}
        </code>
      </pre>
    );
  }

  if (block.type === 'checkbox') {
    return (
      <div className="flex items-start gap-2 mb-2">
        <input
          type="checkbox"
          checked={block.checked || false}
          onChange={(e) => updateBlock(docId, block.id, { checked: e.target.checked })}
          className="mt-1"
        />
        <span
          {...baseProps}
          className="outline-none min-h-[1.5em] flex-1"
          key={`${block.id}-${isFocused ? 'edit' : 'view'}`}
        >
          {renderLinks()}
        </span>
      </div>
    );
  }

  if (block.type === 'bullet-list') {
    return (
      <ul className="list-disc list-inside mb-2 ml-4">
        <li 
          {...baseProps}
          key={`${block.id}-${isFocused ? 'edit' : 'view'}`}
        >
          {renderLinks()}
        </li>
      </ul>
    );
  }

  if (block.type === 'link') {
    const linkType = block.linkType || 'url';
    const linkValue = block.linkValue || '';
    const displayText = block.content || (linkType === 'page' ? linkValue : linkValue || 'Enter URL...');

    const handlePageSelect = (pageTitle) => {
      updateBlock(docId, block.id, { linkValue: pageTitle, content: pageTitle });
      setShowPageSelector(false);
      setIsFocused(false); // Exit editing mode after selection
    };

    const handleUrlChange = (e) => {
      const url = e.target.value;
      updateBlock(docId, block.id, { linkValue: url, content: url });
    };

    const handleUrlBlur = () => {
      setIsFocused(false);
    };

    if (linkType === 'page') {
      if ((shouldShowPageSelector || showPageSelector) && !linkValue) {
        const pageTitles = getAllDocumentTitles();
        const blockElement = document.querySelector(`[data-block-id="${block.id}"]`);
        let menuPosition = { top: 100, left: 100 };
        
        if (blockElement) {
          const rect = blockElement.getBoundingClientRect();
          const scrollY = window.scrollY || window.pageYOffset;
          const scrollX = window.scrollX || window.pageXOffset;
          menuPosition = {
            top: rect.bottom + scrollY + 5,
            left: rect.left + scrollX
          };
        }


        return (
          <div className="mb-2 relative">
            <div 
              ref={pageSelectorRef}
              className="fixed bg-white border border-gray-300 rounded-lg shadow-xl py-1 z-50 min-w-[240px] max-h-[300px] overflow-y-auto"
              style={{ 
                top: `${menuPosition.top}px`, 
                left: `${menuPosition.left}px`,
                maxWidth: '90vw'
              }}
            >
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
                Select a page
              </div>
              {pageTitles.map((title, index) => (
                <div
                  key={title}
                  className={`px-4 py-2 hover:bg-blue-50 cursor-pointer transition-colors ${
                    index === selectedPageIndex ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handlePageSelect(title)}
                  onMouseEnter={() => setSelectedPageIndex(index)}
                >
                  <div className="font-medium text-gray-900">{title || 'Untitled'}</div>
                </div>
              ))}
              {pageTitles.length === 0 && (
                <div className="px-4 py-2 text-gray-500">No pages available</div>
              )}
            </div>
          </div>
        );
      }
      
      if (linkValue) {
        const handleLinkClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const doc = getDocumentByTitle(linkValue);
          if (doc) {
            const inNewTab = !!(e.metaKey || e.ctrlKey);
            if (inNewTab) {
              const url = `${window.location.origin}/doc/${doc.id}`;
              window.open(url, '_blank');
            } else {
              openDocument(doc.id, false);
            }
          }
        };

        return (
          <div className="mb-2">
            <a
              href="#"
              onClick={handleLinkClick}
              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            >
              {displayText}
            </a>
          </div>
        );
      }
      
      return (
        <div className="mb-2">
          <button
            onClick={() => setShowPageSelector(true)}
            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
          >
            Select a page...
          </button>
        </div>
      );
    }

    if (isFocused || (!linkValue && !isFloating)) {
      return (
        <div className="mb-2">
          <input
            type="url"
            value={linkValue}
            onChange={handleUrlChange}
            onBlur={handleUrlBlur}
            placeholder="Enter URL..."
            className="w-full px-2 py-1 border border-gray-300 rounded outline-none focus:border-blue-500"
            autoFocus={isFocused || !linkValue}
          />
        </div>
      );
    } else {
      if (linkValue) {
        const handleLinkClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(linkValue, e.metaKey || e.ctrlKey ? '_blank' : '_self');
        };

        return (
          <div className="mb-2">
            <a
              href={linkValue}
              onClick={handleLinkClick}
              className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
            >
              {displayText}
            </a>
          </div>
        );
      }
      
      // No URL entered
      return (
        <div className="mb-2 text-gray-400 italic">
          Enter URL...
        </div>
      );
    }
  }

  return (
    <p
      {...baseProps}
      className="outline-none min-h-[1.5em] mb-2"
      key={`${block.id}-${isFocused ? 'edit' : 'view'}`}
    >
      {renderLinks()}
    </p>
  );
};

export default BlockRenderer;
