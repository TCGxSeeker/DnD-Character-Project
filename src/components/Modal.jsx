import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function Modal({ title, eyebrow, children, onClose, className = "" }) {
  const titleId = useId();
  const dialogRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
    focusable()[0]?.focus();
    const handleKeyDown = (event) => {
      if (event.key === "Escape") return onClose();
      if (event.key !== "Tab") return;
      const controls = focusable();
      if (!controls.length) return event.preventDefault();
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={`modal-shell material-floating ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="modal-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20} /></button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
