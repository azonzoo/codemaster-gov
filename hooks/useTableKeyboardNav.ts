import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseTableKeyboardNavOptions {
  rowCount: number;
  onEnter: (index: number) => void;
  onEscape?: () => void;
  tableRef: RefObject<HTMLTableSectionElement>;
}

export interface UseTableKeyboardNavReturn {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTableSectionElement>) => void;
}

/**
 * Custom hook for keyboard navigation in HTML tables.
 * Implements the roving tabindex pattern with arrow key navigation,
 * Home/End, PageUp/PageDown, Enter, and Escape support.
 */
export function useTableKeyboardNav(
  options: UseTableKeyboardNavOptions
): UseTableKeyboardNavReturn {
  const { rowCount, onEnter, onEscape, tableRef } = options;
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Clamp focused index when rowCount changes (e.g., filter/pagination)
  useEffect(() => {
    if (rowCount === 0) {
      setFocusedIndex(-1);
    } else if (focusedIndex >= rowCount) {
      setFocusedIndex(rowCount - 1);
    }
  }, [rowCount, focusedIndex]);

  // Auto-scroll the focused row into view
  useEffect(() => {
    if (focusedIndex < 0 || !tableRef.current) return;
    const rows = tableRef.current.querySelectorAll<HTMLTableRowElement>('tr[data-row-index]');
    const targetRow = rows[focusedIndex];
    if (targetRow) {
      targetRow.scrollIntoView({ block: 'nearest' });
      targetRow.focus({ preventScroll: true });
    }
  }, [focusedIndex, tableRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableSectionElement>) => {
      if (rowCount === 0) return;

      // Ignore key events originating from interactive elements inside rows
      // (e.g., checkboxes, buttons, inputs) to avoid conflicts
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const PAGE_JUMP = 5;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const current = prev < 0 ? -1 : prev;
            return Math.min(current + 1, rowCount - 1);
          });
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const current = prev < 0 ? 0 : prev;
            return Math.max(current - 1, 0);
          });
          break;
        }

        case 'Home': {
          e.preventDefault();
          setFocusedIndex(0);
          break;
        }

        case 'End': {
          e.preventDefault();
          setFocusedIndex(rowCount - 1);
          break;
        }

        case 'PageDown': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const current = prev < 0 ? 0 : prev;
            return Math.min(current + PAGE_JUMP, rowCount - 1);
          });
          break;
        }

        case 'PageUp': {
          e.preventDefault();
          setFocusedIndex((prev) => {
            const current = prev < 0 ? 0 : prev;
            return Math.max(current - PAGE_JUMP, 0);
          });
          break;
        }

        case 'Enter': {
          if (focusedIndex >= 0 && focusedIndex < rowCount) {
            e.preventDefault();
            onEnter(focusedIndex);
          }
          break;
        }

        case 'Escape': {
          e.preventDefault();
          setFocusedIndex(-1);
          // Blur the current target
          if (target instanceof HTMLElement) {
            target.blur();
          }
          if (onEscape) {
            onEscape();
          }
          break;
        }

        default:
          break;
      }
    },
    [rowCount, focusedIndex, onEnter, onEscape]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}
