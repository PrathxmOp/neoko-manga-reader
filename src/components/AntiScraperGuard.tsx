import React, { useEffect } from 'react';

export const AntiScraperGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // 1. Prevent Right Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Prevent Drag and Drop of Images and Content
    const handleDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement).tagName === 'IMG' || (e.target as HTMLElement).closest('img')) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Block Developer Tools & Inspection Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd) {
        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+Shift+C (Inspect Element)
        if (e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          return false;
        }

        // Ctrl+U (View Source)
        if (e.key === 'U' || e.key === 'u') {
          e.preventDefault();
          return false;
        }

        // Ctrl+S (Save Page / Save Image)
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault();
          return false;
        }
      }
    };

    // Attach global listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="select-none min-h-screen">
      {children}
    </div>
  );
};
