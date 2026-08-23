'use client'

import React, { useEffect, useState } from 'react'
import { Download, X, GraduationCap, Smartphone, Sparkles, CheckCircle2, Monitor, Share } from 'lucide-react'

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [activeInstructionTab, setActiveInstructionTab] = useState<'chrome' | 'ios' | 'desktop'>('chrome')

  useEffect(() => {
    // Check if running in PWA standalone mode
    const isStandaloneMode = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandaloneMode) {
      setIsStandalone(true)
      return
    }

    // Detect OS default tab for instructions
    const ua = navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveInstructionTab('ios')
    } else if (!/android|iphone|ipad|ipod/.test(ua)) {
      setActiveInstructionTab('desktop')
    }

    // Check if user recently dismissed auto-popup
    const dismissedTime = localStorage.getItem('pwa_prompt_dismissed')
    const isDismissedRecently = dismissedTime && (Date.now() - parseInt(dismissedTime, 10)) < 3 * 24 * 60 * 60 * 1000 // 3 days

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
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

  const handleHeaderButtonClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then(({ outcome }: { outcome: string }) => {
        if (outcome === 'accepted') {
          setIsStandalone(true)
        }
        setDeferredPrompt(null)
      })
    } else {
      setIsOpen(true)
    }
  }

  const handleModalInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsStandalone(true)
      }
      setDeferredPrompt(null)
      setIsOpen(false)
    }
  }

  const handleDismiss = () => {
    setIsOpen(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  // If already running inside installed standalone PWA app window, don't show install option
  if (isStandalone) {
    return null
  }

  return (
    <>
      {/* Header Quick Action Button - Always visible when opened in standard web browser */}
      <button
        onClick={handleHeaderButtonClick}
        className="inline-flex items-center gap-1.5 sm:gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-sm hover:shadow px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-extrabold active:scale-[0.98] transition cursor-pointer shrink-0"
        title="Install Web App to Home Screen"
      >
        <Download className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0 text-white animate-bounce" />
        <span>Install App</span>
      </button>

      {/* Custom Installation Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleDismiss}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-blue-100 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto"
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

              {/* Directly trigger browser prompt if available */}
              {deferredPrompt ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Instant 1-Tap access from home screen</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Fullscreen app mode without browser bar</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Faster daily task logging & notifications</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                    <button
                      onClick={handleModalInstallClick}
                      className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="h-4.5 w-4.5" />
                      Install Now
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Step-by-Step Instructions by Device */
                <div className="space-y-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
                    <button
                      onClick={() => setActiveInstructionTab('chrome')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        activeInstructionTab === 'chrome' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Android
                    </button>
                    <button
                      onClick={() => setActiveInstructionTab('ios')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        activeInstructionTab === 'ios' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Share className="h-3.5 w-3.5" />
                      iPhone / iPad
                    </button>
                    <button
                      onClick={() => setActiveInstructionTab('desktop')}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                        activeInstructionTab === 'desktop' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      Computer
                    </button>
                  </div>

                  <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs space-y-3">
                    {activeInstructionTab === 'chrome' && (
                      <ol className="space-y-2 text-slate-700 font-semibold list-decimal list-inside">
                        <li>Tap the Chrome menu icon <strong className="text-slate-900 font-extrabold">(⋮ or 3 dots)</strong> at top right.</li>
                        <li>Select <strong className="text-blue-700 font-extrabold">"Install app"</strong> or <strong className="text-blue-700 font-extrabold">"Add to Home screen"</strong>.</li>
                        <li>Tap <strong className="text-slate-900 font-extrabold">Install</strong> to add the app icon to your phone home screen.</li>
                      </ol>
                    )}

                    {activeInstructionTab === 'ios' && (
                      <ol className="space-y-2 text-slate-700 font-semibold list-decimal list-inside">
                        <li>Tap the Safari Share button <strong className="text-slate-900 font-extrabold">(📤 Share icon)</strong> at the bottom of screen.</li>
                        <li>Scroll down and tap <strong className="text-blue-700 font-extrabold">"Add to Home Screen"</strong>.</li>
                        <li>Tap <strong className="text-slate-900 font-extrabold">Add</strong> in top right corner.</li>
                      </ol>
                    )}

                    {activeInstructionTab === 'desktop' && (
                      <ol className="space-y-2 text-slate-700 font-semibold list-decimal list-inside">
                        <li>Look at the address bar top right: click the <strong className="text-blue-700 font-extrabold">Install Icon (computer/plus)</strong>.</li>
                        <li>Or click the 3-dots menu <strong className="text-slate-900 font-extrabold">(⋮)</strong> → <strong className="text-slate-900 font-extrabold">Save and share</strong> → <strong className="text-blue-700 font-extrabold">"Install Student Daily Tracking"</strong>.</li>
                      </ol>
                    )}
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Got It
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

