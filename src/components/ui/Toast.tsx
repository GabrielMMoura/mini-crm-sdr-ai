import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'warning' | 'info'

type ToastProps = {
  message: string | null
  onClose?: () => void
  type?: ToastType
}

const toastStyles: Record<ToastType, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
}

export function Toast({ message, onClose, type = 'info' }: ToastProps) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null)
  const isVisible = Boolean(message) && dismissedMessage !== message

  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setDismissedMessage(message)
      onClose?.()
    }, 5000)

    return () => window.clearTimeout(timeoutId)
  }, [message, onClose])

  if (!message || !isVisible) {
    return null
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-lg',
        toastStyles[type],
      )}
      role="status"
    >
      <p className="min-w-0 flex-1">{message}</p>
      <button
        aria-label="Fechar mensagem"
        className="rounded p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        onClick={() => {
          setDismissedMessage(message)
          onClose?.()
        }}
        type="button"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
