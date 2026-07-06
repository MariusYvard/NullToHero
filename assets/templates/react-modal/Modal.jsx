/*
  Accessible modal dialog. MIT licensed. No external UI library.
  Behavior: role="dialog" with aria-modal, Escape closes, overlay click closes,
  focus moves into the dialog on open and returns to the trigger on close, and
  Tab is trapped within the dialog (focus trap intent).
  Props: open (boolean, required), onClose (function, required),
  title (string, optional), children (optional).
*/
import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function Modal({ open, onClose, title, children }) {
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(null);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const node = dialogRef.current;
      if (!node) return;
      const items = node.querySelectorAll(FOCUSABLE);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const node = dialogRef.current;
    const focusables = node ? node.querySelectorAll(FOCUSABLE) : [];
    const target = focusables.length > 0 ? focusables[0] : node;
    if (target && target.focus) target.focus();

    return () => {
      const prev = previouslyFocused.current;
      if (prev && prev.focus) prev.focus();
    };
  }, [open]);

  if (!open) return null;

  const labelId = title ? "modal-title" : undefined;

  const onOverlayMouseDown = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={onOverlayMouseDown}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        ref={dialogRef}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="modal-head">
          {title ? (
            <h2 className="modal-title" id="modal-title">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            className="modal-close"
            aria-label="Close dialog"
            onClick={onClose}
          >
            &times;
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
