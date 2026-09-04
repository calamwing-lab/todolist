'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Download, CheckCircle2, X, Smartphone } from 'lucide-react'

export function PWAInstallPrompt() {
  const promptRef = useRef<any>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    ) {
      setIsStandalone(true)
      return
    }

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
      setShowPanel(false)
      promptRef.current = null
      ;(window as any).deferredPwaPrompt = null
    }

    // Close panel on outside click
    const onOutsideClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowPanel(false)
      }
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('pwa-prompt-ready', onReady)
    window.addEventListener('appinstalled', onInstalled)
    document.addEventListener('mousedown', onOutsideClick)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('pwa-prompt-ready', onReady)
      window.removeEventListener('appinstalled', onInstalled)
      document.removeEventListener('mousedown', onOutsideClick)
    }
  }, [])

  const handleInstall = async () => {
    const prompt = promptRef.current ?? (window as any).deferredPwaPrompt
    if (!prompt) return

    try {
      await prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setShowPanel(false)
        setTimeout(() => setIsStandalone(true), 1500)
      }
      promptRef.current = null
      ;(window as any).deferredPwaPrompt = null
    } catch {
      // silently ignore
    }
  }

  if (isStandalone) return null

  return (
    <div className="relative shrink-0" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowPanel(v => !v)}
        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm hover:shadow px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold active:scale-[0.98] transition cursor-pointer"
        title="Install App"
      >
        {installed
          ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-white" />
          : <Download className="h-3.5 w-3.5 shrink-0 text-white animate-bounce" />
        }
        <span>{installed ? 'Installed!' : 'Install App'}</span>
      </button>

      {/* Custom In-Page Install Panel */}
      {showPanel && (
        <div className="absolute top-full right-0 mt-2 z-[300] w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          style={{ animation: 'slideDown 0.2s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600">
            <span className="text-white font-bold text-sm">Install App</span>
            <button
              onClick={() => setShowPanel(false)}
              className="text-white/70 hover:text-white transition p-0.5 rounded-lg hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* App Info */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shrink-0">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900 truncate">Student Daily Tracking</p>
              <p className="text-[11px] text-slate-400 font-medium truncate">todolist.calam2.vercel.app</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ Works offline · Fast · Secure</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              onClick={handleInstall}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold text-sm py-2 rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
            >
              Install
            </button>
            <button
              onClick={() => setShowPanel(false)}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2 rounded-xl transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  )
}
