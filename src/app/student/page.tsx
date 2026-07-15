'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, logout, getLatestVideo, getDailyTasks, saveDailyTasks, getStudentHistoryLast7Days, updateStudentPersonalTasks, getLeaderboard, LeaderboardEntry, PersonalTask, getMainTasks, MainTask } from '@/utils/db'
import { 
  LogOut, GraduationCap, Bell,
  Play, Calendar, BookOpen, AlertCircle, Loader2, Sparkles, Trophy,
  Tag, X, Plus, Globe, Download, Smartphone, Check
} from 'lucide-react'
import { getBadgeForPercentage, getNextBadge } from '@/utils/badge'



interface VideoRecord {
  id: string
  url: string
  description: string | null
  created_at: string
}

export default function StudentPage() {
  const router = useRouter()

  // App & User state
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('Student')
  const [studentPhone, setStudentPhone] = useState('')
  const [studentBatch, setStudentBatch] = useState<string | undefined>(undefined)

  // Video state
  const [latestVideo, setLatestVideo] = useState<VideoRecord | null>(null)
  const [hasNewVideoToday, setHasNewVideoToday] = useState(false)

  // Checklist state
  const [taskData, setTaskData] = useState<{ [key: string]: boolean }>({})
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Weekly Average performance state
  const [weeklyAverage, setWeeklyAverage] = useState<number>(0)
  const [dailyStats, setDailyStats] = useState<{ day: string; date: string; percentage: number; isToday: boolean }[]>([])

  // Personal Tasks state
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([])
  const [newSkillInput, setNewSkillInput] = useState('')

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  // Notification state
  const [showNotifications, setShowNotifications] = useState(false)

  // Main tasks state
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallBtn, setShowInstallBtn] = useState(false)
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallBtn(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone) {
      setShowInstallBtn(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setIsInstallModalOpen(true)
      return
    }
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)
    setDeferredPrompt(null)
    setShowInstallBtn(false)
  }

  // Get local date in YYYY-MM-DD
  const getLocalDateString = () => {
    return new Date().toLocaleDateString('en-CA') // outputs YYYY-MM-DD
  }

  // Extract YouTube ID
  const getYoutubeEmbedUrl = (url: string) => {
    try {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
      const match = url.match(regExp)
      const videoId = (match && match[2].length === 11) ? match[2] : null
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`
      }
    } catch (e) {
      console.error(e)
    }
    return null
  }

  // Calculate weekly performance average percentage & daily progress stats
  const [isCalculated, setIsCalculated] = useState(false) // helper to trigger initial bar animation
  const calculateStats = async (uid: string, currentTodayTasks: Record<string, boolean>, currentTasksList: MainTask[]) => {
    try {
      const dateStrings: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        dateStrings.push(d.toLocaleDateString('en-CA')) // YYYY-MM-DD format
      }

      const historyLogs = await getStudentHistoryLast7Days(uid, dateStrings)
      const todayStr = getLocalDateString()

      let totalPercentageSum = 0
      const dailyArray = historyLogs.map(log => {
        let tData = log.task_data
        const isToday = log.date === todayStr
        if (isToday) {
          tData = currentTodayTasks
        }
        const completed = Object.values(tData).filter(Boolean).length
        const pct = currentTasksList.length > 0 ? Math.round((completed / currentTasksList.length) * 100) : 0
        totalPercentageSum += pct

        // Parse day name (e.g. "Mon")
        const dateObj = new Date(log.date + 'T00:00:00')
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }) // Mon, Tue, etc.
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // Jul 12

        return {
          day: dayName,
          date: formattedDate,
          percentage: pct,
          isToday
        }
      })

      const avgPct = Math.round(totalPercentageSum / 7)
      setWeeklyAverage(avgPct)
      setDailyStats(dailyArray)
      setTimeout(() => setIsCalculated(true), 100)
    } catch (err) {
      console.error('Error calculating weekly stats:', err)
    }
  }

  // Load user session, latest video, and today's tasks
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const user = getCurrentUser()
        if (!user || user.role !== 'student') {
          router.replace('/login')
          return
        }

        // If the cached user ID is not a valid UUID (e.g. from an old session), force re-login
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(user.id)) {
          handleLogout()
          return
        }

        setUserId(user.id)
        setStudentPhone(user.phone || '')
        setStudentName(user.name || 'Student')
        setStudentBatch(user.batch)
        setPersonalTasks(user.personalTasks || [])

        // Fetch latest video
        const video = await getLatestVideo()
        if (video) {
          setLatestVideo(video)
          
          // Check if it was added today
          const videoDate = new Date(video.created_at).toDateString()
          const todayDate = new Date().toDateString()
          if (videoDate === todayDate) {
            const isDismissed = localStorage.getItem(`dt_dismissed_video_${user.id}_${video.id}`) === 'true'
            if (!isDismissed) {
              setHasNewVideoToday(true)
            }
          }
        }

        // Fetch main tasks
        const tasksList = await getMainTasks()
        setMainTasks(tasksList)

        // Fetch today's checklist
        const localDate = getLocalDateString()
        const savedData = await getDailyTasks(user.id, localDate)
        let finalData: { [key: string]: boolean } = {}

        if (Object.keys(savedData).length > 0) {
          finalData = savedData
          setTaskData(savedData)
        } else {
          // Initialize empty checklist in state
          const initialData: { [key: string]: boolean } = {}
          tasksList.forEach(item => {
            initialData[item.id] = false
          })
          finalData = initialData
          setTaskData(initialData)
        }

        // Calculate initial stats
        await calculateStats(user.id, finalData, tasksList)

        // Load leaderboard
        const boardData = await getLeaderboard()
        setLeaderboard(boardData)


      } catch (err) {
        console.error('Error loading student dashboard:', err)
      } finally {
        setLoading(false)
      }
    }

    initializeDashboard()
  }, [])

  const handleLogout = async () => {
    logout()
    router.replace('/login')
  }

  const handleBellClick = () => {
    setShowNotifications(!showNotifications)
  }

  const handleNotificationItemClick = () => {
    setShowNotifications(false)
    if (hasNewVideoToday && latestVideo && userId) {
      setHasNewVideoToday(false)
      localStorage.setItem(`dt_dismissed_video_${userId}_${latestVideo.id}`, 'true')
    }
    document.getElementById('video-player-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Handle checking/unchecking items
  const handleToggleTask = async (taskId: string) => {
    if (!userId) return

    const updatedTasks = {
      ...taskData,
      [taskId]: !taskData[taskId]
    }
    
    setTaskData(updatedTasks)
    await calculateStats(userId, updatedTasks, mainTasks)
    setSaving(true)
    setSaveStatus('Saving...')

    try {
      const localDate = getLocalDateString()
      await saveDailyTasks(userId, localDate, updatedTasks)
      setSaveStatus('All tasks saved')
      const boardData = await getLeaderboard()
      setLeaderboard(boardData)
    } catch (err: any) {
      console.error('Failed to save task update:', err.message)
      setSaveStatus('Error saving')
    } finally {
      setTimeout(() => setSaveStatus(null), 1500)
      setSaving(false)
    }
  }

  // Handle toggling a personal task completion state
  const handleTogglePersonalTask = async (taskId: string) => {
    if (!userId) return

    const updatedTasks = personalTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )
    setPersonalTasks(updatedTasks)

    try {
      await updateStudentPersonalTasks(userId, updatedTasks)
    } catch (err) {
      console.error('Failed to update personal task completion:', err)
    }
  }

  // Handle adding a personal task
  const handleAddPersonalTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !newSkillInput.trim()) return

    const trimmedTask = newSkillInput.trim()
    
    // Avoid exact label duplicates
    if (personalTasks.some(t => t.label.toLowerCase() === trimmedTask.toLowerCase())) {
      setNewSkillInput('')
      return
    }

    const newTask: PersonalTask = {
      id: 'ptask-' + Math.random().toString(36).substr(2, 9),
      label: trimmedTask,
      completed: false
    }

    const updatedTasks = [...personalTasks, newTask]
    setPersonalTasks(updatedTasks)
    setNewSkillInput('')

    try {
      await updateStudentPersonalTasks(userId, updatedTasks)
    } catch (err) {
      console.error('Failed to save personal task:', err)
    }
  }

  // Handle removing a personal task
  const handleRemovePersonalTask = async (taskId: string) => {
    if (!userId) return

    const updatedTasks = personalTasks.filter(t => t.id !== taskId)
    setPersonalTasks(updatedTasks)

    try {
      await updateStudentPersonalTasks(userId, updatedTasks)
    } catch (err) {
      console.error('Failed to remove personal task:', err)
    }
  }


  // Calculate percentage
  const totalTasks = mainTasks.length
  const completedTasks = mainTasks.filter(task => taskData[task.id]).length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Helper to map dark badge classes to high-contrast light theme equivalents
  const getLightBadge = (badgeName: string) => {
    switch (badgeName) {
      case 'Legend': return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100', glow: 'shadow-none' }
      case 'Platinum': return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', glow: 'shadow-none' }
      case 'Gold': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', glow: 'shadow-none' }
      case 'Silver': return { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', glow: 'shadow-none' }
      case 'Bronze': return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100', glow: 'shadow-none' }
      default: return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-100', glow: 'shadow-none' }
    }
  }

  // Motivation Message based on progress
  const getMalayalamMotivation = (percentage: number) => {
    if (percentage === 0) {
      return "Welcome to today! Start checking off your tasks."
    } else if (percentage < 40) {
      return "Good start! Small steps lead to big changes. Keep going!"
    } else if (percentage < 80) {
      return "Great work! You're making excellent progress. Keep it up!"
    } else {
      return "Fantastic! You've accomplished your primary goals. Have an amazing day!"
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-bold text-slate-600">Loading Student Dashboard...</span>
        </div>
      </div>
    )
  }

  const todayBadge = getBadgeForPercentage(completionPercentage)
  const TodayIcon = todayBadge.icon

  const weeklyBadge = getBadgeForPercentage(weeklyAverage)
  const WeeklyIcon = weeklyBadge.icon

  const nextBadgeInfo = getNextBadge(weeklyAverage)

  const embedUrl = latestVideo ? getYoutubeEmbedUrl(latestVideo.url) : null

  const todayBadgeLight = getLightBadge(todayBadge.name)
  const weeklyBadgeLight = getLightBadge(weeklyBadge.name)

  return (
    <div className="relative flex min-h-screen flex-col bg-blue-50 text-slate-800">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-blue-50 to-blue-50 pointer-events-none" />
      
      {/* Header */}
      <header className="relative z-30 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 shadow-sm shadow-blue-500/5">
                <GraduationCap className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-900 truncate">
                  Daily Tracking System
                </span>
                <span className="text-[9px] sm:text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Student
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  className="relative p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-none"
                >
                  <Bell className={`h-5 w-5 ${hasNewVideoToday ? 'animate-bounce text-blue-600' : ''}`} />
                  {hasNewVideoToday && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                </button>

                {showNotifications && (
                  <div className="fixed top-16 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white border border-slate-100 rounded-2xl p-4 shadow-md z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      {hasNewVideoToday && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                          New Update
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
                      {latestVideo ? (
                        <div 
                          onClick={handleNotificationItemClick}
                          className="group p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer flex gap-3 text-left"
                        >
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-50 border border-cyan-100 text-cyan-600">
                            <Play className="h-4 w-4" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <span className="block text-xs font-bold text-slate-900 group-hover:text-cyan-600 truncate">
                              New Class Video Uploaded
                            </span>
                            <p className="text-[11px] text-slate-600 line-clamp-2">
                              {latestVideo.description || 'Watch the latest YouTube video class.'}
                            </p>
                            <span className="block text-[9px] text-slate-600 font-mono">
                              {new Date(latestVideo.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-slate-600">
                          No recent updates found.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-transparent hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold active:scale-[0.98] transition cursor-pointer text-slate-700 shrink-0"
                  title="Install App"
                >
                  <Download className="h-4 w-4 shrink-0 text-slate-700" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}

              <span className="hidden md:inline text-xs text-slate-600 font-bold">
                Phone: {studentPhone}
              </span>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 p-2 sm:px-4 sm:py-2 text-sm font-bold border border-red-200 hover:border-red-300 active:scale-[0.98] transition cursor-pointer text-red-600"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        
        {/* Language Day Saturday Warning Banner */}
        {new Date().getDay() === 6 && (
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500 hover:scale-[1.005] hover:border-amber-200 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-200 text-amber-700 shrink-0">
                <AlertCircle className="h-5 w-5 animate-pulse text-amber-700" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Language Day Alert</h4>
                <p className="text-xs text-slate-600 font-semibold mt-0.5 leading-relaxed">
                  Tomorrow (Sunday) is <strong>Language Day</strong>! Only English or Arabic should be spoken. Prepare yourself.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[10px] bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full text-amber-700 font-bold uppercase tracking-wider shrink-0">
              Tomorrow
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Embed & Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Welcome Card */}
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col items-center text-center space-y-2 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out cursor-default animate-in fade-in slide-in-from-top-4 duration-500">
              <span className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center justify-center gap-2">
                Welcome
              </span>
              <h1 className="text-2xl font-bold text-slate-900">
                {studentName}
              </h1>
              <p className="text-xs text-slate-600 max-w-xs font-semibold">
                Track your daily tasks and watch educational materials below.
              </p>
            </div>

            {/* Sunday: Language Day Special Card */}
            {new Date().getDay() === 0 && (
              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 hover:scale-[1.005] transition-all duration-300">
                <div className="flex items-center justify-between border-b border-slate-100/65 pb-3 gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                    <Globe className="h-4.5 w-4.5 text-blue-600 animate-pulse shrink-0" />
                    <span className="truncate">Language Day</span>
                  </h3>
                  <span className="text-[9px] sm:text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 border border-blue-100/60 px-2 py-0.5 rounded-full shrink-0">
                    Active
                  </span>
                </div>
                
                <div className="space-y-3 text-center py-2">
                  <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100/60 text-blue-600 shadow-sm">
                    <Globe className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-slate-900">English &amp; Arabic Only</p>
                    <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                      Today is Language Day! Speaking in Malayalam is strictly prohibited on campus. Let's practice and improve together!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Badge & Ranking Card */}
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-5 animate-in fade-in slide-in-from-top-4 duration-500 delay-75 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Trophy className="h-4 w-4 text-blue-600 shrink-0" />
                  <span className="truncate">Badge & Ranking</span>
                </h3>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono font-bold shrink-0">Rank Level</span>
              </div>

              {/* Today's Badge Section */}
              <div className="space-y-3">
                <span className="text-xs text-slate-600 font-semibold block">Today's Badge:</span>
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${todayBadgeLight.bg} ${todayBadgeLight.border} ${todayBadgeLight.glow} transition-all duration-300`}>
                  <div className={`p-2.5 rounded-lg bg-white border border-slate-200 ${todayBadgeLight.text}`}>
                    <TodayIcon className="h-6 w-6 animate-pulse" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={`text-sm sm:text-base font-bold tracking-wide ${todayBadgeLight.text}`}>
                        {todayBadge.name}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${todayBadgeLight.bg} ${todayBadgeLight.border} ${todayBadgeLight.text}`}>
                        {todayBadge.malName}
                      </span>
                    </div>
                    <span className="block text-[11px] text-slate-600 font-semibold">
                      {todayBadge.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Weekly Rank level (7-day Average) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-semibold">7-Day Rank Level:</span>
                  <span className="text-xs font-bold text-blue-600">{weeklyAverage}% Avg</span>
                </div>
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${weeklyBadgeLight.bg} ${weeklyBadgeLight.border} ${weeklyBadgeLight.glow} transition-all duration-300`}>
                  <div className={`p-2.5 rounded-lg bg-white border border-slate-200 ${weeklyBadgeLight.text}`}>
                    <WeeklyIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className={`text-sm sm:text-base font-bold tracking-wide ${weeklyBadgeLight.text}`}>
                        {weeklyBadge.name}
                      </span>
                      <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${weeklyBadgeLight.bg} ${weeklyBadgeLight.border} ${weeklyBadgeLight.text}`}>
                        {weeklyBadge.malName}
                      </span>
                    </div>
                    <span className="block text-[11px] text-slate-600 font-semibold">
                      {weeklyBadge.description}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Rank Goal */}
              {nextBadgeInfo && (() => {
                const nextBadgeLight = getLightBadge(nextBadgeInfo.badge.name)
                return (
                  <div className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Next Level Goal</span>
                    <span className="text-slate-600 font-semibold">
                      Need <strong className="text-slate-900 font-bold">{nextBadgeInfo.neededPct}%</strong> more completion to achieve <span className={`${nextBadgeLight.text} font-bold`}>{nextBadgeInfo.badge.name} ({nextBadgeInfo.badge.malName})</span>.
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* Personal Tasks Card */}
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-100 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                  <span className="truncate">Personal Tasks</span>
                </h3>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono font-bold shrink-0">
                  {personalTasks.filter(t => t.completed).length}/{personalTasks.length} Done
                </span>
              </div>

              {/* Tasks List */}
              <div className="space-y-3">
                {personalTasks.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {personalTasks.map((task) => (
                      <div 
                        key={task.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ease-in-out ${
                          task.completed 
                            ? 'bg-blue-50/50 border-blue-100/60' 
                            : 'bg-white border-slate-100 hover:border-blue-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div 
                          onClick={() => handleTogglePersonalTask(task.id)}
                          className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 select-none"
                        >
                          {/* Custom Checkbox */}
                          <div
                            className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-200 ease-in-out focus:outline-none ${
                              task.completed
                                ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-100'
                                : 'border-slate-200 bg-white hover:border-blue-200'
                            }`}
                          >
                            {task.completed && (
                              <svg viewBox="0 0 12 10" fill="none" className="h-2.5 w-2.5">
                                <polyline
                                  points="1.5,5 4.5,8 10.5,1"
                                  stroke="white"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span className={`text-xs font-bold truncate transition-all duration-200 ${
                            task.completed ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}>
                            {task.label}
                          </span>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleRemovePersonalTask(task.id)}
                          className="text-slate-500 hover:text-red-500 transition cursor-pointer p-0.5 rounded ml-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-3 space-y-1">
                    <p className="text-xs text-slate-600 font-semibold italic">
                      No personal tasks added yet. Add some below!
                    </p>
                  </div>
                )}
              </div>

              {/* Add Task Form */}
              <form onSubmit={handleAddPersonalTask} className="flex gap-2 pt-2 border-t border-slate-100">
                <input
                  type="text"
                  placeholder="e.g. Quran revision, Exercise, Reading..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  maxLength={50}
                  className="flex-1 px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-semibold"
                />
                <button
                  type="submit"
                  onClick={handleAddPersonalTask}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-[0.96] transition cursor-pointer flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 stroke-[3]" />
                </button>
              </form>
            </div>

            {/* Leaderboard / Rank List Card */}
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 delay-150 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Trophy className="h-4 w-4 text-amber-500 shrink-0 animate-bounce" />
                  <span className="truncate">Rank List</span>
                </h3>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono font-bold shrink-0">Weekly Standing</span>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1
                  const isCurrentUser = entry.id === userId
                  const entryBadge = getBadgeForPercentage(entry.avgPercentage)
                  const BadgeIcon = entryBadge.icon
                  const entryBadgeLight = getLightBadge(entryBadge.name)

                  // Dynamic styling for top ranks
                  let rankBg = "bg-slate-50 text-slate-600"
                  let rankBorder = "border-slate-100"
                  if (rank === 1) {
                    rankBg = "bg-amber-50 text-amber-600 font-bold border-amber-100/80"
                  } else if (rank === 2) {
                    rankBg = "bg-slate-100 text-slate-700 font-bold border-slate-100"
                  } else if (rank === 3) {
                    rankBg = "bg-orange-50 text-orange-700 font-bold border-orange-100/80"
                  }

                  return (
                    <div 
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 ${
                        isCurrentUser 
                          ? 'bg-blue-50 border-blue-100 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-blue-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Number Tag */}
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs border font-bold ${rankBg} ${rankBorder}`}>
                          {rank}
                        </span>
                        
                        {/* Name & Badge Icon */}
                        <div className="min-w-0">
                          <span className={`block text-xs font-bold truncate ${isCurrentUser ? 'text-blue-700' : 'text-slate-900'}`}>
                            {entry.name} {isCurrentUser && <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded ml-1 font-bold">You</span>}
                          </span>
                          
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${entryBadgeLight.text}`}>
                            <BadgeIcon className="h-2.5 w-2.5 shrink-0" />
                            {entryBadge.name}
                          </span>
                        </div>
                      </div>

                      {/* Percentage Score */}
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-mono font-bold text-slate-900">
                          {entry.avgPercentage}%
                        </span>
                        <span className="block text-[8px] text-slate-600 uppercase tracking-widest font-bold">
                          Avg Task
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Video Section */}
            <div id="video-player-section" className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 hover:scale-[1.005] hover:shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Play className="h-4 w-4 text-blue-600" />
                  Latest Video Class
                </h3>
                {hasNewVideoToday && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                    New Today
                  </span>
                )}
              </div>

              {embedUrl ? (
                <div className="space-y-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                    <iframe
                      src={embedUrl}
                      title={latestVideo?.description || 'YouTube video player'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      {latestVideo?.description || 'Class material description'}
                    </h4>
                    <span className="text-[10px] text-slate-600 font-semibold block mt-1">
                      Uploaded: {latestVideo?.created_at ? new Date(latestVideo.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-100 rounded-xl bg-slate-50">
                  <BookOpen className="h-10 w-10 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 font-semibold">No active video assigned.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: To-Do Checklist */}
          <div className="lg:col-span-2 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 delay-100">
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 hover:shadow-md transition-all duration-300 ease-out">
              
              {/* Header / Date */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100/60">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Daily To-Do List</h2>
                    <span className="text-xs text-slate-600 font-semibold font-mono">
                      Date: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {saveStatus && (
                    <span className="text-xs text-blue-600 font-bold animate-pulse">
                      {saveStatus}
                    </span>
                  )}
                  <span className="text-sm font-bold text-slate-600">
                    {completedTasks} / {totalTasks} Completed
                  </span>
                </div>
              </div>

              {/* Motivation Section */}
              <div className="py-4 flex flex-col items-center justify-center text-center">
                <div className="bg-blue-50 border border-blue-100/60 px-6 py-3 rounded-xl shadow-sm w-full max-w-2xl">
                  <p className="text-[15px] font-bold text-blue-800 leading-relaxed tracking-wide">
                    {getMalayalamMotivation(completionPercentage)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Task Completion</span>
                  <span className="text-blue-600">{completionPercentage}%</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionPercentage}%` }}
                  />
                </div>
              </div>

              {/* Checkbox Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                {mainTasks.map((task) => {
                  const isChecked = !!taskData[task.id]
                  return (
                    <div
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`group flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none transition-all duration-200 ease-in-out ${
                        isChecked
                          ? 'bg-blue-50/40 border-blue-100'
                          : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50/50'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <div
                        className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-100'
                            : 'border-slate-200 bg-white group-hover:border-blue-200'
                        }`}
                      >
                        {isChecked && (
                          <svg viewBox="0 0 12 10" fill="none" className="h-3 w-3">
                            <polyline
                              points="1.5,5 4.5,8 10.5,1"
                              stroke="white"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>

                      <span className={`text-sm font-bold leading-snug transition-all duration-200 ${
                        isChecked
                          ? 'text-blue-800 opacity-80'
                          : 'text-slate-900 group-hover:text-slate-900'
                      }`}>
                        {task.label}
                      </span>
                    </div>
                  )
                })}
              </div>

            </div>

            {/* 7-Day Progress Graph Card */}
            <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-5 hover:shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 duration-500 delay-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                  <span className="truncate">7-Day Completion Progress</span>
                </h3>
                <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono font-bold shrink-0">Weekly Analytics</span>
              </div>

              {/* Custom SVG/CSS Bar Graph */}
              <div className="pt-2">
                <div className="relative flex items-end justify-between h-48 border-b border-slate-100 pb-2 px-2 gap-1 sm:gap-2">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1 select-none">
                    <div className="w-full border-t border-slate-100 h-0 flex justify-end"><span className="text-[9px] font-bold text-slate-600 -mt-2 bg-white border border-slate-100 px-1 rounded shadow-sm">100%</span></div>
                    <div className="w-full border-t border-slate-100 h-0 flex justify-end"><span className="text-[9px] font-bold text-slate-600 -mt-2 bg-white border border-slate-100 px-1 rounded shadow-sm">75%</span></div>
                    <div className="w-full border-t border-slate-100 h-0 flex justify-end"><span className="text-[9px] font-bold text-slate-600 -mt-2 bg-white border border-slate-100 px-1 rounded shadow-sm">50%</span></div>
                    <div className="w-full border-t border-slate-100 h-0 flex justify-end"><span className="text-[9px] font-bold text-slate-600 -mt-2 bg-white border border-slate-100 px-1 rounded shadow-sm">25%</span></div>
                    <div className="w-full h-0 flex justify-end"><span className="text-[9px] font-bold text-slate-600 -mt-2 bg-white border border-slate-100 px-1 rounded shadow-sm">0%</span></div>
                  </div>

                  {/* Bars */}
                  {dailyStats.map((stat, idx) => {
                    const barHeight = isCalculated ? stat.percentage : 0
                    return (
                      <div key={idx} className="flex flex-col items-center flex-1 group z-10 relative">
                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white border border-slate-100 text-slate-900 text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md font-bold text-center z-30 whitespace-nowrap">
                          <span className="block text-blue-600">{stat.percentage}% Done</span>
                          <span className="block text-[9px] text-slate-600 font-semibold">{stat.date}</span>
                        </div>

                        {/* Bar Fill Wrapper */}
                        <div className="relative w-6 sm:w-10 bg-slate-50/60 border border-slate-100 rounded-t-md sm:rounded-t-lg overflow-hidden h-36 flex items-end">
                          <div 
                            style={{ height: `${barHeight}%` }}
                            className={`w-full rounded-t-[3px] sm:rounded-t-[5px] bg-gradient-to-t transition-all duration-1000 ease-out ${
                              stat.isToday 
                                ? 'from-blue-600 to-cyan-500 shadow-sm border-t border-cyan-300' 
                                : 'from-slate-300 to-slate-200'
                            }`}
                          />
                        </div>
                        
                        {/* X-Axis labels */}
                        <span className={`text-[10px] sm:text-[11px] font-bold mt-2.5 tracking-wide truncate max-w-full ${stat.isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                          {stat.day}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600">
                          {stat.date.split(' ')[1]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Install App Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-100 rounded-2xl p-6 shadow-lg animate-in zoom-in-95 duration-200 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 bg-blue-50 rounded-full flex items-center justify-center border border-blue-100/60">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Install App</h3>
                <p className="text-sm text-slate-600 font-semibold">To install this app on your device:</p>
                <ol className="text-sm text-slate-600 font-semibold mt-4 text-left space-y-3 list-decimal list-inside">
                  <li>In your browser menu, tap <strong>Share</strong> or <strong>Menu</strong> (three dots).</li>
                  <li>Select <strong>Add to Home screen</strong> or <strong>Install App</strong>.</li>
                </ol>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="mt-6 w-full py-2.5 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors shadow-sm"
              >
                <Check className="h-4 w-4 text-white" />
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
