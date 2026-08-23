import React, { useEffect, useState, useMemo } from 'react'
import { getStudentAllTasks, getMainTasks, MainTask } from '@/utils/db'
import { Calendar, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Trophy, Clock, Target, Activity, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DayLog {
  date: string
  completedCount: number
  totalCount: number
  percentage: number
  task_data: { [key: string]: boolean }
}

export function StudentReportView({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<DayLog[]>([])
  const [chartHistory, setChartHistory] = useState<DayLog[]>([])
  const [expandedDates, setExpandedDates] = useState<{ [key: string]: boolean }>({})
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [isCalculated, setIsCalculated] = useState(false)
  const [displayLimit, setDisplayLimit] = useState(14)

  // Calendar Jump State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth())

  useEffect(() => {
    const fetchHistory = async () => {
      try {
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

        const fullTimeline = allTaskLogs.map(log => computeLogStats(log, log.date))
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const chartData = [...chartHistory].reverse().map(day => {
    const dateObj = new Date(day.date + 'T00:00:00')
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' })
    const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const todayStr = new Date().toLocaleDateString('en-CA')
    const isToday = day.date === todayStr

    return {
      day: dayName,
      date: formattedDate,
      percentage: day.percentage,
      isToday
    }
  })

  // Calculate Lifetime Summary
  const totalDays = history.length
  const activeDays = history.filter(d => d.completedCount > 0).length
  const inactiveDays = totalDays - activeDays
  const avgPercentage = totalDays > 0 ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / totalDays) : 0
  
  let bestDay: DayLog | null = null
  if (totalDays > 0) {
    bestDay = history.reduce((best, curr) => curr.percentage > best.percentage ? curr : best, history[0])
  }

  const displayedHistory = history.slice(0, displayLimit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Complete Progress Report
        </h3>
        <span className="text-xs text-slate-500 font-semibold italic">
          Lifetime overview and history
        </span>
      </div>

      {/* Lifetime Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-100">
          <div className="flex items-center gap-1.5 text-slate-500 mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Days Tracked</span>
          </div>
          <span className="text-2xl font-extrabold text-slate-900">{totalDays}</span>
        </div>
        
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150">
          <div className="flex items-center gap-1.5 text-blue-600 mb-2">
            <Target className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700">Lifetime Avg</span>
          </div>
          <span className="text-2xl font-extrabold text-blue-600">{avgPercentage}%</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-200">
          <div className="flex items-center gap-1.5 text-amber-600 mb-2">
            <Trophy className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700">Best Day</span>
          </div>
          <span className="text-lg font-extrabold text-amber-600 truncate">{bestDay ? bestDay.percentage + '%' : 'N/A'}</span>
          <span className="text-[10px] text-amber-700/70 font-semibold truncate mt-0.5">{bestDay ? new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-300 delay-300">
          <div className="flex items-center gap-1.5 text-emerald-600 mb-2">
            <Activity className="h-4 w-4" />
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700">Active Days</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-emerald-600">{activeDays}</span>
            <span className="text-xs text-slate-500 font-semibold">/ {totalDays}</span>
          </div>
        </div>
      </div>

      {/* 7-Day Progress Graph Card */}
      <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-5 hover:shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 duration-500 delay-75">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
            <span className="truncate">7-Day Completion Progress</span>
          </h3>
          <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-semibold">Weekly Analytics</span>
        </div>

        <div className="pt-2">
          <div className="relative flex items-end justify-between h-48 border-b border-slate-100 pb-2 px-2 gap-1 sm:gap-2">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1 select-none">
              <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">100%</span></div>
              <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">75%</span></div>
              <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">50%</span></div>
              <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">25%</span></div>
              <div className="w-full h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">0%</span></div>
            </div>

            {chartData.map((stat, idx) => {
              const barHeight = isCalculated ? stat.percentage : 0
              return (
                <div key={idx} className="flex flex-col items-center flex-1 group z-10 relative">
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl font-mono text-center z-30 whitespace-nowrap">
                    <span className="block font-bold text-cyan-400">{stat.percentage}% Done</span>
                    <span className="block text-[8px] text-slate-350">{stat.date}</span>
                  </div>

                  <div className="relative w-6 sm:w-10 bg-slate-50 rounded-t-md sm:rounded-t-lg border border-slate-200/80 overflow-hidden h-36 flex items-end">
                    <div 
                      style={{ height: `${barHeight}%` }}
                      className={`w-full rounded-t-[3px] sm:rounded-t-[5px] bg-gradient-to-t transition-all duration-1000 ease-out ${
                        stat.isToday 
                          ? 'from-blue-600 to-cyan-500 shadow-sm border-t border-cyan-400' 
                          : 'from-blue-400/80 to-blue-500/80'
                      }`}
                    />
                  </div>
                  
                  <span className={`text-[9px] sm:text-[10px] font-bold mt-2 tracking-wide truncate max-w-full ${stat.isToday ? 'text-blue-600' : 'text-slate-600'}`}>
                    {stat.day}
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono font-semibold">
                    {stat.date.split(' ')[1]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Full History / Calendar Section */}
      <div className="pt-2">
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

        {/* Modal Calendar Popover */}
        {isCalendarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
              {/* Popover Header */}
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

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                  <span key={d} className="text-[11px] font-bold text-slate-600 uppercase tracking-wider py-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Calendar Grid */}
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

                      {/* Performance Indicator Dot */}
                      {perf && cell.isCurrentMonth && (
                        <span className={`h-1.5 w-1.5 rounded-full ${perf.bgClass} mt-0.5`} />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Indicator Legend */}
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

        {/* Selected Date View or Default History List */}
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
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
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
                          return (
                            <div 
                              key={task.id}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border select-none transition-all duration-150 ${
                                isCompleted 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                                  : 'bg-red-50 border-red-300 text-red-800'
                              }`}
                            >
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
                          )
                        })}
                      </div>
                    </div>
                  </div>
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
            {displayedHistory.map((day) => {
              const isExpanded = !!expandedDates[day.date]
              const formattedDate = new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
              })

              return (
                <div 
                  key={day.date}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                >
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
                          return (
                            <div 
                              key={task.id}
                              className={`flex items-start gap-2.5 p-3 rounded-xl border select-none transition-all duration-150 ${
                                isCompleted 
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                                  : 'bg-red-50 border-red-300 text-red-800'
                              }`}
                            >
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
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            
            {displayLimit < history.length && (
              <div className="pt-4 flex justify-center pb-2">
                <button
                  onClick={() => setDisplayLimit(prev => prev + 14)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] transition-all shadow-sm flex items-center gap-2"
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

