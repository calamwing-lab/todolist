'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, GraduationCap, Smartphone, Sparkles, CheckCircle2 } from 'lucide-react'

interface PWAInstallPromptProps {
  variant?: 'button' | 'banner' | 'modal'
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running in PWA standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandaloneMode) {
      setIsStandalone(true)
      return
    }

    // Check if user recently dismissed in-app banner
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed')
    const isDismissedRecently = dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 3 * 24 * 60 * 60 * 1000 // 3 days

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowPrompt(true)
      if (!isDismissedRecently) {
        // Auto-show in-app prompt modal after a short delay
        setTimeout(() => setIsOpen(true), 1500)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
      setDeferredPrompt(null)
    }
    setIsOpen(false)
  }

  const handleDismiss = () => {
    setIsOpen(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <>
      {/* In-Header Quick Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold active:scale-[0.98] transition cursor-pointer shrink-0"
        title="Install Web App"
      >
        <Download className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0 text-white" />
        <span>Install App</span>
      </button>

      {/* Custom In-App Installation Modal (Rendered inside the Web App UI) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-blue-100 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative accent */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500" />
            
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="space-y-5 pt-2">
              {/* Header with App Icon */}
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-extrabold uppercase tracking-wider mb-1">
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    Web App Installation
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                    Install Daily Tracking App
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Add to home screen for 1-tap app experience
                  </p>
                </div>
              </div>

              {/* Benefits list */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Instant 1-Tap access from home screen</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Fullscreen app mode without browser URL bar</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Faster load times & easy daily task tracking</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                <button
                  onClick={handleInstallClick}
                  className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Download className="h-4.5 w-4.5" />
                  Install Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
