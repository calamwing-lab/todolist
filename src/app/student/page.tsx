'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getCurrentUserAsync, logout, getLatestVideo, getDailyTasks, saveDailyTasks, getStudentHistoryLast7Days, updateStudentPersonalTasks, getLeaderboard, LeaderboardEntry, PersonalTask, getMainTasks, MainTask, getStudentById, markNotificationsAsRead, getVideos } from '@/utils/db'
import { safeSetItem } from '@/utils/safe-storage'
import { 
  LogOut, GraduationCap, Bell,
  Play, Calendar, BookOpen, AlertCircle, Loader2, Sparkles, Trophy, BarChart2,
  Tag, X, Plus, Globe, Download, Smartphone, Check, CheckCircle2, XCircle, ExternalLink
} from 'lucide-react'
import { getBadgeForPercentage, getNextBadge } from '@/utils/badge'
import { StudentReportView } from '@/components/StudentReportView'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { ScrollReveal } from '@/components/ScrollReveal'

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
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [hasUnreadNotification, setHasUnreadNotification] = useState(false)

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

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard')

  // Get local date in YYYY-MM-DD
  const getLocalDateString = () => {
    return new Date().toLocaleDateString('en-CA')
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
  const [isCalculated, setIsCalculated] = useState(false)
  const calculateStats = async (uid: string, currentTodayTasks: Record<string, boolean>, currentTasksList: MainTask[]) => {
    try {
      const dateStrings: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toLocaleDateString('en-CA')
        if (dStr >= '2026-09-07') {
          dateStrings.push(dStr)
        }
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

        const dateObj = new Date(log.date + 'T00:00:00')
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        return {
          day: dayName,
          date: formattedDate,
          percentage: pct,
          isToday
        }
      })

      const count = dailyArray.length || 1
      const avgPct = Math.round(totalPercentageSum / count)
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
        let user = getCurrentUser()
        if (!user) {
          user = await getCurrentUserAsync()
        }
        if (!user || user.role !== 'student') {
          router.replace('/login')
          return
        }

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

        const profile = await getStudentById(user.id)
        let lastRead = user.last_notification_read_at
        if (profile) {
          lastRead = profile.last_notification_read_at
          safeSetItem('dt_session', JSON.stringify(profile))
        }

        const vids = await getVideos()
        if (vids.length > 0) {
          setVideos(vids)
          setLatestVideo(vids[0])
          
          if (!lastRead) {
            setHasUnreadNotification(true)
          } else {
            const videoTime = new Date(vids[0].created_at).getTime()
            const readTime = new Date(lastRead).getTime()
            if (videoTime > readTime) {
              setHasUnreadNotification(true)
            }
          }
        }

        const tasksList = await getMainTasks()
        setMainTasks(tasksList)

        const localDate = getLocalDateString()
        const savedData = await getDailyTasks(user.id, localDate)
        let finalData: { [key: string]: boolean } = {}

        if (Object.keys(savedData).length > 0) {
          finalData = savedData
          setTaskData(savedData)
        } else {
          const initialData: { [key: string]: boolean } = {}
          tasksList.forEach(item => {
            initialData[item.id] = false
          })
          finalData = initialData
          setTaskData(initialData)
        }

        await calculateStats(user.id, finalData, tasksList)

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
    if (!showNotifications && hasUnreadNotification && userId) {
      setHasUnreadNotification(false)
      markNotificationsAsRead(userId).catch(err => {
        console.error('Error marking notifications as read:', err)
      })
    }
  }

  const handleNotificationItemClick = () => {
    setShowNotifications(false)
    if (hasUnreadNotification && userId) {
      setHasUnreadNotification(false)
      markNotificationsAsRead(userId).catch(err => {
        console.error('Error marking notifications as read:', err)
      })
    }
    document.getElementById('video-player-section')?.scrollIntoView({ behavior: 'smooth' })
  }

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

  const handleAddPersonalTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !newSkillInput.trim()) return

    const trimmedTask = newSkillInput.trim()
    
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

  const totalTasks = mainTasks.length
  const completedTasks = mainTasks.filter(task => taskData[task.id]).length
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

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
              <div className="relative">
                <button
                  onClick={handleBellClick}
                  className="relative p-1.5 rounded-lg hover:bg-slate-100 transition text-slate-500 hover:text-slate-800 cursor-pointer focus:outline-none"
                >
                  <Bell className={`h-5 w-5 ${hasUnreadNotification ? 'animate-bounce text-blue-600' : ''}`} />
                  {hasUnreadNotification && (
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}
                </button>

                {showNotifications && (
                  <div className="fixed top-16 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:mt-2 w-auto sm:w-80 bg-white border border-slate-100 rounded-2xl p-4 shadow-md z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-900">Notifications</span>
                      {hasUnreadNotification && (
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
              
              <PWAInstallPrompt />

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

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-2.5 py-5 sm:px-6 sm:py-8 w-full space-y-6">
        
        {/* Language Day Alert */}
        {new Date().getDay() === 6 && (
          <ScrollReveal delay={50}>
            <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl shadow-sm flex items-center justify-between gap-4 card-hover-effect">
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
          </ScrollReveal>
        )}

        <div className="grid grid-cols-2 border-b border-blue-100 mb-6 sm:mb-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 pb-3.5 pt-2 border-b-2 text-xs sm:text-sm font-bold transition-all px-1 sm:px-3 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Calendar className="h-4 w-4 shrink-0" />
            <span>Today's Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 pb-3.5 pt-2 border-b-2 text-xs sm:text-sm font-bold transition-all px-1 sm:px-3 cursor-pointer ${
              activeTab === 'report'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">My Progress Report</span>
            <span className="sm:hidden">Progress Report</span>
          </button>
        </div>

        {activeTab === 'dashboard' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Welcome Card */}
            <ScrollReveal delay={100}>
              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm flex flex-col items-center text-center space-y-2 card-hover-effect">
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
            </ScrollReveal>

            {/* Sunday Language Day Card */}
            {new Date().getDay() === 0 && (
              <ScrollReveal delay={150}>
                <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 card-hover-effect">
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
              </ScrollReveal>
            )}

            {/* Badge & Ranking Card */}
            <ScrollReveal delay={200}>
              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-5 card-hover-effect">
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

                {/* Weekly Rank level */}
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
            </ScrollReveal>

            {/* Personal Tasks Card */}
            <ScrollReveal delay={250}>
              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 card-hover-effect">
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
                            className="flex items-start sm:items-center gap-2.5 cursor-pointer min-w-0 flex-1 select-none mr-2"
                          >
                            <div
                              className={`relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-all duration-200 ease-in-out mt-0.5 sm:mt-0 focus:outline-none ${
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
                            <span className={`text-xs font-bold break-words whitespace-normal leading-snug transition-all duration-200 ${
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
            </ScrollReveal>

            {/* Leaderboard Card */}
            <ScrollReveal delay={300}>
              <div className="bg-white border border-slate-100 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 card-hover-effect">
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
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs border font-bold ${rankBg} ${rankBorder}`}>
                            {rank}
                          </span>
                          
                          <div className="min-w-0">
                            <span className={`block text-xs font-bold truncate ${isCurrentUser ? 'text-blue-700' : 'text-slate-900'}`}>
                              {entry.name} {isCurrentUser && <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded ml-1 font-bold">You</span>}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`p-1 rounded-md bg-white border border-slate-200 ${entryBadgeLight.text}`} title={entryBadge.name}>
                            <BadgeIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-bold text-slate-900 font-mono">
                            {entry.avgPercentage}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </ScrollReveal>

          </div>

          {/* Right Column: Daily Checklist */}
          <div className="lg:col-span-2 space-y-6">
            <ScrollReveal delay={150}>
              <div className="bg-white border border-slate-100 p-4 sm:p-8 rounded-2xl shadow-sm space-y-6 card-hover-effect">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Today's Activity Tracker
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 font-semibold">
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    {saving && (
                      <span className="text-xs text-slate-600 font-mono font-bold flex items-center gap-1.5">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        Saving...
                      </span>
                    )}
                    {saveStatus && !saving && (
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full animate-in fade-in">
                        {saveStatus}
                      </span>
                    )}
                    
                    <div className="bg-slate-50 border border-slate-100 px-3.5 py-2 rounded-xl flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <span className="text-[10px] sm:text-xs text-slate-600 font-bold uppercase tracking-wider block">Today's Progress</span>
                      <span className="text-base sm:text-lg font-black text-blue-600 font-mono">
                        {completionPercentage}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Motivation Banner */}
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-3 text-slate-900">
                  <Sparkles className="h-5 w-5 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold leading-relaxed">
                    {getMalayalamMotivation(completionPercentage)}
                  </span>
                </div>

                {/* Task Checklist Items */}
                <div className="space-y-3 pt-2">
                  {mainTasks.map((task) => {
                    const isChecked = !!taskData[task.id]
                    return (
                      <div
                        key={task.id}
                        onClick={() => handleToggleTask(task.id)}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border cursor-pointer select-none transition-all duration-200 ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-200 text-blue-950 shadow-sm'
                            : 'bg-white border-slate-100 text-slate-800 hover:border-blue-200 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1 mr-2">
                          <div
                            className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 mt-0.5 sm:mt-0 ${
                              isChecked
                                ? 'bg-blue-600 border-blue-600 shadow-sm shadow-blue-200'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isChecked && (
                              <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                            )}
                          </div>

                          <span className={`text-xs sm:text-sm font-bold break-words whitespace-normal leading-snug transition-all ${
                            isChecked ? 'text-blue-950' : 'text-slate-800'
                          }`}>
                            {task.label}
                          </span>
                        </div>

                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border shrink-0 ${
                          isChecked 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isChecked ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Class Video Section - All Added Videos */}
                {videos.length > 0 && (
                  <div 
                    id="video-player-section" 
                    className="pt-6 border-t border-slate-100 space-y-4"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600" />
                        Class Video Tutorials
                      </h3>
                      <span className="text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                        {videos.length} {videos.length === 1 ? 'Video' : 'Videos'} Added
                      </span>
                    </div>

                    <div className="space-y-5">
                      {videos.map((vid, idx) => {
                        const vidEmbed = getYoutubeEmbedUrl(vid.url)
                        const isLatest = idx === 0
                        return (
                          <div 
                            key={vid.id || idx}
                            className="p-3.5 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold">
                                  {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-slate-800 truncate">
                                  Class Video {videos.length > 1 ? `#${idx + 1}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isLatest && (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-tight">
                                    Latest Upload
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 font-mono font-medium">
                                  {new Date(vid.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>

                            {vidEmbed ? (
                              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm border border-slate-200">
                                <iframe
                                  src={vidEmbed}
                                  title={`Class Video ${idx + 1}`}
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                  className="h-full w-full border-0"
                                />
                              </div>
                            ) : (
                              <div className="p-3 bg-white border border-slate-200 rounded-xl text-center space-y-1.5">
                                <p className="text-xs text-slate-600 font-semibold">Video URL is available below:</p>
                                <a
                                  href={vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                                >
                                  <span>Open Video Link</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </div>
                            )}

                            {vid.description && (
                              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-white border border-slate-100 p-3 rounded-xl">
                                {vid.description}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              </div>
            </ScrollReveal>
          </div>

        </div>
        ) : (
          /* Report Tab */
          <div>
            {userId && <StudentReportView userId={userId} />}
          </div>
        )}

      </main>
    </div>
  )
}
