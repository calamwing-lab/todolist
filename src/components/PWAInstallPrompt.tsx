'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Download, CheckCircle2 } from 'lucide-react'

export function PWAInstallPrompt() {
  const promptRef = useRef<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Hide button if already running as installed PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    ) {
      setIsStandalone(true)
      return
    }

    // Grab prompt captured by the inline script in layout.tsx before React loaded
    if ((window as any).deferredPwaPrompt) {
      promptRef.current = (window as any).deferredPwaPrompt
    }

    const onPrompt = (e: Event) => {
      e.preventDefault()
      promptRef.current = e
      ;(window as any).deferredPwaPrompt = e
    }

    const onReady = () => {
      if ((window as any).deferredPwaPrompt) {
        promptRef.current = (window as any).deferredPwaPrompt
      }
    }

    const onInstalled = () => {
      setIsStandalone(true)
      promptRef.current = null
      ;(window as any).deferredPwaPrompt = null
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('pwa-prompt-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('pwa-prompt-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const handleClick = async () => {
    const prompt = promptRef.current ?? (window as any).deferredPwaPrompt
    if (!prompt) return // browser hasn't offered install yet — do nothing silently

    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setTimeout(() => setIsStandalone(true), 1500)
      }
      promptRef.current = null
      ;(window as any).deferredPwaPrompt = null
    } catch {
      // Silently ignore any errors
    }
  }

  if (isStandalone) return null

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm hover:shadow px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold active:scale-[0.98] transition cursor-pointer shrink-0"
      title="Install App"
    >
      {installed
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white" />
        : <Download className="h-3.5 w-3.5 shrink-0 text-white animate-bounce" />
      }
      <span>{installed ? 'Installed!' : 'Install App'}</span>
    </button>
  )
}
