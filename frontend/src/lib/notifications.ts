import { toast, ToastOptions } from 'sonner'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const toastCache = new Map<string, number>()
const DEDUP_WINDOW_MS = 600

const emitToast = (type: ToastType, message: string, options?: ToastOptions) => {
  if (!message) return

  const key = options?.id ? String(options.id) : `${type}:${message}`
  const now = Date.now()
  const last = toastCache.get(key) ?? 0

  if (now - last < DEDUP_WINDOW_MS) {
    return
  }

  toastCache.set(key, now)
  toast[type](message, options)
}

export const notifySuccess = (message: string, options?: ToastOptions) => emitToast('success', message, options)

export const notifyError = (message: string, options?: ToastOptions) => emitToast('error', message, options)

export const notifyWarning = (message: string, options?: ToastOptions) => emitToast('warning', message, options)

export const notifyInfo = (message: string, options?: ToastOptions) => emitToast('info', message, options)

export const notifyApiError = (error: any, fallback: string = 'Ocurrió un error inesperado') => {
  const message = error?.response?.data?.error?.message || error?.message || fallback
  notifyError(message)
}

