import React, { useEffect, useRef } from 'react'

export default function WelcomeDialog({ open, onClose, children }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open) return
    const previousFocus = document.activeElement
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previousFocus?.focus()
    }
  }, [open])
  return (
    <dialog ref={dialogRef} className="welcome-dialog" aria-labelledby="welcome-title" onCancel={event => { event.preventDefault(); onClose() }}>
      <div className="welcome-dialog-toolbar">
        <button type="button" className="mapa-btn" onClick={onClose} autoFocus>Cerrar bienvenida ×</button>
      </div>
      {children}
    </dialog>
  )
}
