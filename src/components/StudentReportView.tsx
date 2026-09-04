import React, { useEffect, useState, useMemo } from 'react'
import { getStudentAllTasks, getMainTasks, saveDailyTasks, MainTask } from '@/utils/db'
import { Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Trophy, Clock, Target, Activity, FileText, ChevronLeft, ChevronRight, X, TrendingUp, BarChart3, PieChart, Sparkles, Lock } from 'lucide-react'
import { ScrollReveal } from '@/components/ScrollReveal'

interface DayLog {
  date: string
  completedCount: number
  totalCount: number
  percentage: number
  task_data: { [key: string]: boolean }
}

function AnimatedPerformanceDonut({ 
  highPct, modPct, lowPct, highDays, modDays, lowDays, avgPercentage 
}: { 
  highPct: number; modPct: number; lowPct: number; 
  highDays: number; modDays: number; lowDays: number; 
  avgPercentage: number 
}) {
  const [fillProgress, setFillProgress] = useState(0)
  const [hoveredSegment, setHoveredSegment] = useState<'high' | 'mod' | 'low' | null>(null)
  const [hoverCounterVal, setHoverCounterVal] = useState<number | null>(null)

  // 0 to 100% filling animation driven over 1.5 seconds (1500ms)
  useEffect(() => {
    setFillProgress(0)
    const duration = 1500
    const startTime = performance.now()

    const fillAnimation = (now: number) => {
      const elapsed = now - startTime
      const rawProgress = Math.min(elapsed / duration, 1)
      // Ease out cubic curve for smooth filling
      const eased = 1 - Math.pow(1 - rawProgress, 3)
      setFillProgress(eased)

      if (rawProgress < 1) {
        requestAnimationFrame(fillAnimation)
      }
    }

    const frameId = requestAnimationFrame(fillAnimation)
    return () => cancelAnimationFrame(frameId)
  }, [highPct, modPct, lowPct, avgPercentage])

  // Handle segment hover counter transitions
  const targetHoverPct = hoveredSegment === 'high' 
    ? highPct 
    : hoveredSegment === 'mod' 
      ? modPct 
      : hoveredSegment === 'low' 
        ? lowPct 
        : null

  useEffect(() => {
    if (targetHoverPct === null) {
      setHoverCounterVal(null)
      return
    }
    const duration = 300
    const startTime = performance.now()
    const startVal = hoverCounterVal ?? Math.round(avgPercentage * fillProgress)

    const animateHoverNum = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = progress * (2 - progress)
      const current = Math.round(startVal + (targetHoverPct - startVal) * eased)
      setHoverCounterVal(current)

      if (progress < 1) {
        requestAnimationFrame(animateHoverNum)
      }
    }

    const frameId = requestAnimationFrame(animateHoverNum)
    return () => cancelAnimationFrame(frameId)
  }, [targetHoverPct])

  const circumference = 238.76

  // Calculate scaled arc fill lengths based on 0-100% fillProgress ratio
  const curHighRatio = (highPct / 100) * fillProgress
  const curModRatio = (modPct / 100) * fillProgress
  const curLowRatio = (lowPct / 100) * fillProgress

  const highDash = curHighRatio * circumference
  const modDash = curModRatio * circumference
  const lowDash = curLowRatio * circumference

  const highOffset = 0
  const modOffset = -curHighRatio * circumference
  const lowOffset = -(curHighRatio + curModRatio) * circumference

  const displayPercent = hoverCounterVal !== null 
    ? hoverCounterVal 
    : Math.round(avgPercentage * fillProgress)

  return (
    <div className="relative flex flex-col items-center justify-center py-2">
      <div className="relative w-44 h-44 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="14" fill="none" />
          
          {/* High segment (Green) */}
          <circle
            cx="50" cy="50" r="38"
            stroke="#10b981"
            strokeWidth={hoveredSegment === 'high' ? 18 : 14}
            fill="none"
            strokeDasharray={`${highDash} ${circumference}`}
            strokeDashoffset={highOffset}
            strokeLinecap="round"
            className="transition-all duration-300 cursor-pointer donut-segment-hover"
            onMouseEnter={() => setHoveredSegment('high')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              filter: hoveredSegment === 'high' ? 'drop-shadow(0 0 10px rgba(16, 185, 129, 0.8))' : 'none'
            }}
          />

          {/* Moderate segment (Orange/Amber) */}
          <circle
            cx="50" cy="50" r="38"
            stroke="#f59e0b"
            strokeWidth={hoveredSegment === 'mod' ? 18 : 14}
            fill="none"
            strokeDasharray={`${modDash} ${circumference}`}
            strokeDashoffset={modOffset}
            strokeLinecap="round"
            className="transition-all duration-300 cursor-pointer donut-segment-hover"
            onMouseEnter={() => setHoveredSegment('mod')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              filter: hoveredSegment === 'mod' ? 'drop-shadow(0 0 10px rgba(245, 158, 11, 0.8))' : 'none'
            }}
          />

          {/* Low segment (Rose/Red) */}
          <circle
            cx="50" cy="50" r="38"
            stroke="#f43f5e"
            strokeWidth={hoveredSegment === 'low' ? 18 : 14}
            fill="none"
            strokeDasharray={`${lowDash} ${circumference}`}
            strokeDashoffset={lowOffset}
            strokeLinecap="round"
            className="transition-all duration-300 cursor-pointer donut-segment-hover"
            onMouseEnter={() => setHoveredSegment('low')}
            onMouseLeave={() => setHoveredSegment(null)}
            style={{
              filter: hoveredSegment === 'low' ? 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.8))' : 'none'
            }}
          />
        </svg>

        {/* Center Text with animated 0-100% counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300">
          <span className="text-3xl font-black text-slate-900 tracking-tight transition-transform duration-200 scale-100">
            {displayPercent}%
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-0.5">
            {hoveredSegment === 'high' ? 'High' : hoveredSegment === 'mod' ? 'Moderate' : hoveredSegment === 'low' ? 'Low' : 'Overall Avg'}
          </span>
        </div>
      </div>

      <div className="w-full pt-4 space-y-2 border-t border-slate-100 text-xs font-semibold">
        <div 
          className={`flex items-center justify-between p-2 rounded-xl transition-all duration-300 cursor-pointer ${
            hoveredSegment === 'high' 
              ? 'bg-emerald-50 border border-emerald-300 shadow-sm translate-x-1' 
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          onMouseEnter={() => setHoveredSegment('high')}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full bg-emerald-500 transition-transform ${hoveredSegment === 'high' ? 'scale-125 ring-2 ring-emerald-300' : ''}`} />
            <span className="text-slate-800 font-bold">High (≥80%)</span>
          </div>
          <span className="font-mono text-slate-900 font-extrabold">{highDays} days ({highPct}%)</span>
        </div>

        <div 
          className={`flex items-center justify-between p-2 rounded-xl transition-all duration-300 cursor-pointer ${
            hoveredSegment === 'mod' 
              ? 'bg-amber-50 border border-amber-300 shadow-sm translate-x-1' 
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          onMouseEnter={() => setHoveredSegment('mod')}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full bg-amber-500 transition-transform ${hoveredSegment === 'mod' ? 'scale-125 ring-2 ring-amber-300' : ''}`} />
            <span className="text-slate-800 font-bold">Moderate (50-79%)</span>
          </div>
          <span className="font-mono text-slate-900 font-extrabold">{modDays} days ({modPct}%)</span>
        </div>

        <div 
          className={`flex items-center justify-between p-2 rounded-xl transition-all duration-300 cursor-pointer ${
            hoveredSegment === 'low' 
              ? 'bg-rose-50 border border-rose-300 shadow-sm translate-x-1' 
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          onMouseEnter={() => setHoveredSegment('low')}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full bg-rose-500 transition-transform ${hoveredSegment === 'low' ? 'scale-125 ring-2 ring-rose-300' : ''}`} />
            <span className="text-slate-800 font-bold">Low (&lt;50%)</span>
          </div>
          <span className="font-mono text-slate-900 font-extrabold">{lowDays} days ({lowPct}%)</span>
        </div>
      </div>
    </div>
  )
}

export function StudentReportView({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<DayLog[]>([])
  const [chartHistory, setChartHistory] = useState<DayLog[]>([])
  const [expandedDates, setExpandedDates] = useState<{ [key: string]: boolean }>({})
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [isCalculated, setIsCalculated] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(14)
  const [hoveredNode, setHoveredNode] = useState<{ dateStr: string; formattedDate: string; day: string; percentage: number; x: number; y: number } | null>(null)

  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth())

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true)
        const tasksList = await getMainTasks()
        setMainTasks(tasksList)

        const dateStrings: string[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dateStrings.push(d.toLocaleDateString('en-CA'))
        }

        const allTaskLogs = await getStudentAllTasks(userId)

        const computeLogStats = (log: any, date: string): DayLog => {
          const task_data = log && log.task_data ? { ...log.task_data } : {}
          tasksList.forEach(item => {
            if (task_data[item.id] === undefined) {
              task_data[item.id] = false
            }
          })
          const completedCount = tasksList.filter(item => task_data[item.id]).length
          const totalCount = tasksList.length
          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          return { date, completedCount, totalCount, percentage, task_data }
        }

        const allLoggedDatesSet = new Set(allTaskLogs.map(l => l.date))
        const combinedDates = Array.from(new Set([...dateStrings, ...allLoggedDatesSet])).sort().reverse()

        const fullTimeline = combinedDates.map(date => {
          const log = allTaskLogs.find(l => l.date === date)
          return computeLogStats(log, date)
        })

        setHistory(fullTimeline)

        const chartTimeline = dateStrings.map(date => {
          const log = allTaskLogs.find(l => l.date === date)
          return computeLogStats(log, date)
        })
        
        setChartHistory(chartTimeline.reverse())

        if (fullTimeline.length > 0) {
          setExpandedDates({ [fullTimeline[0].date]: true })
        }
        setTimeout(() => setIsCalculated(true), 150)
      } catch (err) {
        console.error('Failed to load student history:', err)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchHistory()
    }
  }, [userId])

  const historyMap = useMemo(() => {
    const map: { [date: string]: DayLog } = {}
    history.forEach(log => {
      map[log.date] = log
    })
    return map
  }, [history])

  const toggleDayExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  const handleToggleDailyTask = async (date: string, taskId: string) => {
    if (!userId) return

    const todayStr = new Date().toLocaleDateString('en-CA')
    if (date !== todayStr) {
      // Past dates (yesterday and earlier) are locked and read-only!
      return
    }

    const targetDay = history.find(d => d.date === date)
    const currentTaskData = targetDay ? { ...targetDay.task_data } : {}
    const updatedTaskData = {
      ...currentTaskData,
      [taskId]: !currentTaskData[taskId]
    }

    try {
      await saveDailyTasks(userId, date, updatedTaskData)

      setHistory(prev => prev.map(day => {
        if (day.date === date) {
          const completedCount = mainTasks.filter(item => updatedTaskData[item.id]).length
          const totalCount = mainTasks.length
          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          return { ...day, task_data: updatedTaskData, completedCount, percentage }
        }
        return day
      }))

      setChartHistory(prev => prev.map(day => {
        if (day.date === date) {
          const completedCount = mainTasks.filter(item => updatedTaskData[item.id]).length
          const totalCount = mainTasks.length
          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          return { ...day, task_data: updatedTaskData, completedCount, percentage }
        }
        return day
      }))
    } catch (err) {
      console.error('Failed to update daily task completion:', err)
    }
  }

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11)
      setCalendarYear(y => y - 1)
    } else {
      setCalendarMonth(m => m - 1)
    }
  }

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0)
      setCalendarYear(y => y + 1)
    } else {
      setCalendarMonth(m => m + 1)
    }
  }

  const getPerformanceIndicator = (log: DayLog | undefined) => {
    if (!log || log.totalCount === 0) return null
    if (log.percentage >= 60) {
      return {
        bgClass: 'bg-emerald-500',
        cellBg: 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-bold hover:bg-emerald-100'
      }
    }
    return {
      bgClass: 'bg-rose-500',
      cellBg: 'bg-rose-50/70 border-rose-200 text-rose-950 font-bold hover:bg-rose-100'
    }
  }

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay()
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
    const prevMonthTotalDays = new Date(calendarYear, calendarMonth, 0).getDate()

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = []

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i
      const prevM = calendarMonth === 0 ? 11 : calendarMonth - 1
      const prevY = calendarMonth === 0 ? calendarYear - 1 : calendarYear
      const mm = String(prevM + 1).padStart(2, '0')
      const dd = String(dayNum).padStart(2, '0')
      days.push({ dateStr: `${prevY}-${mm}-${dd}`, dayNum, isCurrentMonth: false })
    }

    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mm = String(calendarMonth + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      days.push({ dateStr: `${calendarYear}-${mm}-${dd}`, dayNum: d, isCurrentMonth: true })
    }

    const remaining = days.length <= 35 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0)
    for (let d = 1; d <= remaining; d++) {
      const nextM = calendarMonth === 11 ? 0 : calendarMonth + 1
      const nextY = calendarMonth === 11 ? calendarYear + 1 : calendarYear
      const mm = String(nextM + 1).padStart(2, '0')
      const dd = String(d).padStart(2, '0')
      days.push({ dateStr: `${nextY}-${mm}-${dd}`, dayNum: d, isCurrentMonth: false })
    }

    return days
  }, [calendarYear, calendarMonth])

  const totalDays = history.length
  const activeDays = history.filter(d => d.completedCount > 0).length
  const avgPercentage = totalDays > 0 ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / totalDays) : 0
  
  let bestDay: DayLog | null = null
  if (totalDays > 0) {
    bestDay = history.reduce((best, curr) => curr.percentage > best.percentage ? curr : best, history[0])
  }

  const highDays = history.filter(d => d.percentage >= 80).length
  const modDays = history.filter(d => d.percentage >= 50 && d.percentage < 80).length
  const lowDays = history.filter(d => d.percentage < 50).length

  const highPct = totalDays > 0 ? Math.round((highDays / totalDays) * 100) : 0
  const modPct = totalDays > 0 ? Math.round((modDays / totalDays) * 100) : 0
  const lowPct = totalDays > 0 ? Math.round((lowDays / totalDays) * 100) : 0

  const chartData7Days = useMemo(() => {
    return [...chartHistory].reverse().map(day => {
      const dateObj = new Date(day.date + 'T00:00:00')
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      return {
        day: dayName,
        dateStr: day.date,
        formattedDate,
        percentage: day.percentage
      }
    })
  }, [chartHistory])

  const svgGraph = useMemo(() => {
    const width = 600
    const height = 180
    const paddingX = 40
    const paddingY = 30

    if (chartData7Days.length === 0) return { lineD: '', areaD: '', nodes: [] }

    const nodes = chartData7Days.map((d, i) => {
      const x = paddingX + (i / (chartData7Days.length - 1 || 1)) * (width - 2 * paddingX)
      const y = height - paddingY - (d.percentage / 100) * (height - 2 * paddingY)
      return { ...d, x, y }
    })

    let lineD = `M ${nodes[0].x} ${nodes[0].y}`
    for (let i = 0; i < nodes.length - 1; i++) {
      const p0 = nodes[i]
      const p1 = nodes[i + 1]
      const mx = (p0.x + p1.x) / 2
      lineD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`
    }

    const areaD = `${lineD} L ${nodes[nodes.length - 1].x} ${height - paddingY} L ${nodes[0].x} ${height - paddingY} Z`
    return { lineD, areaD, nodes }
  }, [chartData7Days])

  const displayedHistory = history.slice(0, displayLimit)

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ScrollReveal delay={50}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Complete Progress Report
          </h3>
          <span className="text-xs text-slate-500 font-semibold italic">
            Lifetime overview and history
          </span>
        </div>
      </ScrollReveal>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 items-stretch">
        <ScrollReveal delay={100} className="h-full">
          <div className="bg-white border border-slate-200 p-3 sm:p-4.5 rounded-2xl shadow-sm relative overflow-hidden card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-slate-500 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1 min-w-0 truncate">
                <Target className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Lifetime Avg</span>
              </span>
              <span className={`text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 ${avgPercentage >= 75 ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : avgPercentage >= 50 ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                {avgPercentage >= 75 ? 'Excellent' : avgPercentage >= 50 ? 'Good' : 'Needs Focus'}
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{avgPercentage}%</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} className="h-full">
          <div className="bg-white border border-slate-200 p-3 sm:p-4.5 rounded-2xl shadow-sm card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-slate-500 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1 min-w-0 truncate">
                <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">Days Tracked</span>
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 sm:gap-2 pt-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{totalDays}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold">Total Days</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200} className="h-full">
          <div className="bg-white border border-slate-200 p-3 sm:p-4.5 rounded-2xl shadow-sm card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-slate-500 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 min-w-0 truncate">
                <Activity className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Active Days</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                {totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0}% Rate
              </span>
            </div>
            <div className="flex items-baseline gap-1 pt-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">{activeDays}</span>
              <span className="text-[10px] sm:text-xs text-slate-500 font-semibold">/ {totalDays}</span>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={250} className="h-full">
          <div className="bg-white border border-slate-200 p-3 sm:p-4.5 rounded-2xl shadow-sm card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-slate-500 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 flex items-center gap-1 min-w-0 truncate">
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Best Day</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-600 leading-none">{bestDay ? bestDay.percentage + '%' : 'N/A'}</span>
              <span className="text-[10px] sm:text-xs text-amber-700/80 font-bold shrink-0">
                {bestDay ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Smooth Curved Line Graph Card */}
        <ScrollReveal delay={300} className="lg:col-span-2">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between card-hover-effect h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-blue-600" />
                  Completion Performance
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">7-Day Smooth Trajectory Graph</p>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                Weekly Trend
              </span>
            </div>

            {/* SVG Smooth Curve Area Chart */}
            <div className="relative pt-4">
              <svg viewBox="0 0 600 180" className="w-full h-44 overflow-visible">
                <defs>
                  <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {[100, 75, 50, 25, 0].map(pct => {
                  const y = 30 + ((100 - pct) / 100) * 120
                  return (
                    <g key={pct}>
                      <line x1="35" y1={y} x2="565" y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <text x="30" y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontWeight="bold">
                        {pct}%
                      </text>
                    </g>
                  )
                })}

                {isCalculated && svgGraph.areaD && (
                  <path 
                    d={svgGraph.areaD} 
                    fill="url(#blueAreaGradient)" 
                    className="transition-opacity duration-1000 ease-out" 
                    style={{ opacity: isCalculated ? 1 : 0 }}
                  />
                )}

                {isCalculated && svgGraph.lineD && (
                  <path 
                    d={svgGraph.lineD} 
                    fill="none" 
                    stroke="#2563eb" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeDasharray="1000"
                    strokeDashoffset={isCalculated ? 0 : 1000}
                    className="transition-all duration-1200 ease-out" 
                  />
                )}

                {isCalculated && svgGraph.nodes.map((node, i) => (
                  <g key={i} className="group cursor-pointer">
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="6"
                      className="fill-white stroke-blue-600 stroke-[3] graph-hover-node shadow-lg"
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                    />
                    <text x={node.x} y="172" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
                      {node.day}
                    </text>
                  </g>
                ))}
              </svg>

              {hoveredNode && (
                <div 
                  className="absolute bg-slate-900 border border-slate-800 text-white text-xs px-3 py-1.5 rounded-xl shadow-xl font-mono text-center pointer-events-none z-30 animate-in fade-in zoom-in-95 duration-150"
                  style={{
                    left: `${(hoveredNode.x / 600) * 100}%`,
                    top: `${(hoveredNode.y / 180) * 100}%`,
                    transform: 'translate(-50%, -130%)'
                  }}
                >
                  <span className="block font-bold text-cyan-400">{hoveredNode.percentage}% Score</span>
                  <span className="block text-[9px] text-slate-400">{hoveredNode.formattedDate}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100 text-center">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Avg Score</span>
                <span className="text-sm font-extrabold text-slate-900">{avgPercentage}%</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Active Days</span>
                <span className="text-sm font-extrabold text-emerald-600">{activeDays}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Total Days</span>
                <span className="text-sm font-extrabold text-slate-900">{totalDays}</span>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Best Score</span>
                <span className="text-sm font-extrabold text-amber-600">{bestDay ? bestDay.percentage + '%' : 'N/A'}</span>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Animated Performance Donut Card */}
        <ScrollReveal delay={400}>
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 flex flex-col justify-between card-hover-effect h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PieChart className="h-4.5 w-4.5 text-blue-600" />
                Performance Health
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Distribution</span>
            </div>

            <AnimatedPerformanceDonut
              highPct={highPct}
              modPct={modPct}
              lowPct={lowPct}
              highDays={highDays}
              modDays={modDays}
              lowDays={lowDays}
              avgPercentage={avgPercentage}
            />
          </div>
        </ScrollReveal>

      </div>

      {/* Full History / Calendar Section */}
      <div className="pt-2">
        <ScrollReveal delay={450}>
          <div className="flex items-center justify-between px-1 mb-4 gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              Day-by-Day History
            </h3>

            <div className="relative">
              <button
                onClick={() => setIsCalendarOpen(prev => !prev)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold text-xs rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm active:scale-95"
              >
                <Calendar className="h-4 w-4 text-blue-600" />
                <span>Jump to Date</span>
                <ChevronDown className="h-3.5 w-3.5 text-blue-500 ml-0.5" />
              </button>
            </div>
          </div>
        </ScrollReveal>

        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4.5 w-4.5 text-blue-600" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h4>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={prevMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                    title="Previous Month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition cursor-pointer"
                    title="Next Month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer ml-1"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-1">
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((cell) => {
                  const log = historyMap[cell.dateStr]
                  const perf = getPerformanceIndicator(log)
                  const todayStr = new Date().toLocaleDateString('en-CA')
                  const isToday = cell.dateStr === todayStr

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => {
                        setSelectedDate(cell.dateStr)
                        setIsCalendarOpen(false)
                      }}
                      className={`relative h-10 flex flex-col items-center justify-center rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        !cell.isCurrentMonth
                          ? 'text-slate-300 border-transparent hover:bg-slate-50'
                          : perf
                          ? perf.cellBg
                          : 'text-slate-700 border-transparent hover:bg-slate-100'
                      } ${isToday ? 'ring-2 ring-blue-600 ring-offset-1 font-black text-blue-900' : ''}`}
                    >
                      <span>{cell.dayNum}</span>

                      {perf && cell.isCurrentMonth && (
                        <span className={`h-1.5 w-1.5 rounded-full ${perf.bgClass} mt-0.5`} />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>High (≥60%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Low (&lt;60%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border-2 border-blue-600" />
                  <span>Today</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedDate ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 min-w-0">
                <Calendar className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="truncate">
                  Selected Date: <strong className="font-bold text-blue-950">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </span>
              </div>
              <button
                onClick={() => setSelectedDate(null)}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer shrink-0 shadow-sm"
              >
                Clear Selection
              </button>
            </div>

            {historyMap[selectedDate] ? (
              (() => {
                const day = historyMap[selectedDate]
                const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
                return (
                  <ScrollReveal delay={100}>
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm card-hover-effect">
                      <div className="flex items-center justify-between p-5 sm:p-6 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                          <div>
                            <span className="block font-bold text-sm text-slate-900">
                              {formattedDate}
                            </span>
                            <span className="block text-xs text-slate-600 mt-0.5 font-mono font-semibold">
                              {day.date}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="block text-xs font-bold text-slate-700">
                            {day.completedCount} / {day.totalCount} Completed
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                            {day.percentage}% Score
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {mainTasks.map((task) => {
                            const isCompleted = !!day.task_data[task.id]
                            const todayStr = new Date().toLocaleDateString('en-CA')
                            const isEditable = day.date === todayStr
                            return (
                              <div 
                                key={task.id}
                                onClick={() => isEditable && handleToggleDailyTask(day.date, task.id)}
                                className={`flex items-start justify-between gap-2.5 p-3 rounded-xl border select-none transition-all duration-150 ${
                                  !isEditable 
                                    ? 'cursor-not-allowed opacity-90' 
                                    : 'cursor-pointer active:scale-[0.98]'
                                } ${
                                  isCompleted 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' + (isEditable ? ' hover:bg-emerald-100' : '') 
                                    : 'bg-red-50 border-red-300 text-red-800' + (isEditable ? ' hover:bg-red-100' : '')
                                }`}
                                title={!isEditable ? "Past tasks cannot be edited (Read Only)" : undefined}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="mt-0.5 shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 stroke-[2.5]" />
                                    ) : (
                                      <XCircle className="h-4.5 w-4.5 text-red-500 stroke-[2.5]" />
                                    )}
                                  </div>
                                  <span className={`text-xs font-semibold leading-relaxed ${isCompleted ? 'text-emerald-800' : 'text-red-700'}`}>
                                    {task.label}
                                  </span>
                                </div>
                                {!isEditable && (
                                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                )
              })()
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center space-y-3 shadow-sm">
                <div className="h-12 w-12 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                  <Calendar className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">No Tasks Recorded for This Date</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto font-medium leading-relaxed">
                  There are no task records found for <strong className="text-slate-800 font-bold">{new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>.
                </p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
                >
                  View Full History List
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {displayedHistory.map((day, idx) => {
              const isExpanded = !!expandedDates[day.date]
              const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })

              return (
                <ScrollReveal key={day.date} delay={Math.min(idx * 50, 300)}>
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm card-hover-effect">
                    <div 
                      onClick={() => toggleDayExpansion(day.date)}
                      className="flex items-center justify-between p-5 sm:p-6 hover:bg-slate-50/50 transition cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <div>
                          <span className="block font-bold text-sm text-slate-900">
                            {formattedDate}
                          </span>
                          <span className="block text-xs text-slate-600 mt-0.5 font-mono font-semibold">
                            {day.date}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right">
                          <span className="block text-xs font-bold text-slate-700">
                            {day.completedCount} / {day.totalCount} Completed
                          </span>
                          <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                            {day.percentage}% Score
                          </span>
                        </div>
                        <div className="text-slate-600 group-hover:text-slate-900">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5 sm:p-8 animate-in slide-in-from-top-1 duration-150">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {mainTasks.map((task) => {
                            const isCompleted = !!day.task_data[task.id]
                            const todayStr = new Date().toLocaleDateString('en-CA')
                            const isEditable = day.date === todayStr
                            return (
                              <div 
                                key={task.id}
                                onClick={() => isEditable && handleToggleDailyTask(day.date, task.id)}
                                className={`flex items-start justify-between gap-2.5 p-3 rounded-xl border select-none transition-all duration-150 ${
                                  !isEditable 
                                    ? 'cursor-not-allowed opacity-90' 
                                    : 'cursor-pointer active:scale-[0.98]'
                                } ${
                                  isCompleted 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' + (isEditable ? ' hover:bg-emerald-100' : '') 
                                    : 'bg-red-50 border-red-300 text-red-800' + (isEditable ? ' hover:bg-red-100' : '')
                                }`}
                                title={!isEditable ? "Past tasks cannot be edited (Read Only)" : undefined}
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="mt-0.5 shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 stroke-[2.5]" />
                                    ) : (
                                      <XCircle className="h-4.5 w-4.5 text-red-500 stroke-[2.5]" />
                                    )}
                                  </div>
                                  <span className={`text-xs font-semibold leading-relaxed ${isCompleted ? 'text-emerald-800' : 'text-red-700'}`}>
                                    {task.label}
                                  </span>
                                </div>
                                {!isEditable && (
                                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              )
            })}
            
            {displayLimit < history.length && (
              <div className="pt-4 flex justify-center pb-2">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 14)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                  Load Older Days ({history.length - displayLimit} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
