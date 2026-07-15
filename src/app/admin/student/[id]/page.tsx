'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getStudentHistoryLast7Days, saveDailyTasks, updateStudentPersonalTasks, PersonalTask, getMainTasks, MainTask } from '@/utils/db'
import { 
  ArrowLeft, Calendar, CheckCircle2, XCircle, 
  Loader2, Phone, GraduationCap, ChevronDown, ChevronUp, Trophy,
  Plus, X, AlertCircle
} from 'lucide-react'
import { getBadgeForPercentage } from '@/utils/badge'
import { getStudentAdminData } from '@/app/admin/actions'



interface StudentProfile {
  id: string
  phone: string
  name: string | null
  created_at: string
  personalTasks?: PersonalTask[]
  batch?: string
}

interface DayLog {
  date: string
  completedCount: number
  totalCount: number
  percentage: number
  task_data: { [key: string]: boolean }
}

export default function StudentHistoryPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [history, setHistory] = useState<DayLog[]>([])
  const [expandedDates, setExpandedDates] = useState<{ [key: string]: boolean }>({})
  const [personalTasks, setPersonalTasks] = useState<PersonalTask[]>([])
  const [newPersonalTaskInput, setNewPersonalTaskInput] = useState('')
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [isCalculated, setIsCalculated] = useState(false)

  useEffect(() => {
    const fetchStudentHistory = async () => {
      try {
        // 1. Fetch Main Tasks
        const tasksList = await getMainTasks()
        setMainTasks(tasksList)

        // 2. Fetch Student Profile using server action
        const res = await getStudentAdminData(studentId)
        if (!res.success || !res.student) {
          throw new Error('Student profile not found')
        }
        const profileData = res.student
        setStudent(profileData)
        setPersonalTasks(profileData.personalTasks || [])



        // 3. Generate past 7 dates (including today)
        const dateStrings: string[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dateStrings.push(d.toLocaleDateString('en-CA')) // YYYY-MM-DD format
        }

        // 4. Fetch task records for this student and these dates
        const taskLogs = await getStudentHistoryLast7Days(studentId, dateStrings)


        // Build 7-day timeline
        const timeline: DayLog[] = taskLogs.map(log => {
          const task_data = { ...log.task_data }
          // Fill missing task IDs as false
          tasksList.forEach(item => {
            if (task_data[item.id] === undefined) {
              task_data[item.id] = false
            }
          })

          const completedCount = tasksList.filter(item => task_data[item.id]).length
          const totalCount = tasksList.length
          const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

          return {
            date: log.date,
            completedCount,
            totalCount,
            percentage,
            task_data
          }
        })

        // Order history newest date first
        setHistory(timeline.reverse())

        // Expand the most recent day by default
        if (timeline.length > 0) {
          setExpandedDates({ [timeline[0].date]: true })
        }
        setTimeout(() => setIsCalculated(true), 150)

      } catch (err) {
        console.error('Failed to load student history:', err)
        router.push('/admin')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      fetchStudentHistory()
    }
  }, [studentId])

  const toggleDayExpansion = (date: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }))
  }

  // Handle toggling a personal task completion state
  const handleTogglePersonalTask = async (taskId: string) => {
    if (!studentId) return

    const updatedTasks = personalTasks.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    )
    setPersonalTasks(updatedTasks)

    try {
      await updateStudentPersonalTasks(studentId, updatedTasks)
      
      // Update local student object to sync
      setStudent(prev => prev ? { ...prev, personalTasks: updatedTasks } : null)
    } catch (err) {
      console.error('Failed to update personal task completion:', err)
    }
  }

  // Handle adding a personal task
  const handleAddPersonalTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !newPersonalTaskInput.trim()) return

    const trimmedTask = newPersonalTaskInput.trim()
    
    // Avoid exact duplicate labels
    if (personalTasks.some(t => t.label.toLowerCase() === trimmedTask.toLowerCase())) {
      setNewPersonalTaskInput('')
      return
    }

    const newTask: PersonalTask = {
      id: 'ptask-' + Math.random().toString(36).substr(2, 9),
      label: trimmedTask,
      completed: false
    }

    const updatedTasks = [...personalTasks, newTask]
    setPersonalTasks(updatedTasks)
    setNewPersonalTaskInput('')

    try {
      await updateStudentPersonalTasks(studentId, updatedTasks)
      
      // Update local student object to sync
      setStudent(prev => prev ? { ...prev, personalTasks: updatedTasks } : null)
    } catch (err) {
      console.error('Failed to save personal task:', err)
    }
  }

  // Handle removing a personal task
  const handleRemovePersonalTask = async (taskId: string) => {
    if (!studentId) return

    const updatedTasks = personalTasks.filter(t => t.id !== taskId)
    setPersonalTasks(updatedTasks)

    try {
      await updateStudentPersonalTasks(studentId, updatedTasks)
      
      // Update local student object to sync
      setStudent(prev => prev ? { ...prev, personalTasks: updatedTasks } : null)
    } catch (err) {
      console.error('Failed to remove personal task:', err)
    }
  }

  // Handle toggling completion of a daily task for a specific date
  const handleToggleDailyTask = async (date: string, taskId: string) => {
    if (!studentId) return

    const updatedHistory = await Promise.all(history.map(async (day) => {
      if (day.date === date) {
        const updatedTaskData = {
          ...day.task_data,
          [taskId]: !day.task_data[taskId]
        }
        
        // Save to db/localStorage
        await saveDailyTasks(studentId, date, updatedTaskData)

        const completedCount = mainTasks.filter(item => updatedTaskData[item.id]).length
        const totalCount = mainTasks.length
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

        return {
          ...day,
          task_data: updatedTaskData,
          completedCount,
          percentage
        }
      }
      return day
    }))

    setHistory(updatedHistory)
  }


  // Calculate 7-day average completion percentage
  const averagePercentage = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length)
    : 0

  const studentBadge = getBadgeForPercentage(averagePercentage)
  const BadgeIcon = studentBadge.icon

  // Helper to map dark badge classes to high-contrast light theme equivalents
  const getLightBadge = (badgeName: string) => {
    switch (badgeName) {
      case 'Legend': return { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', glow: 'shadow-sm border-rose-200' }
      case 'Platinum': return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', glow: 'shadow-sm border-blue-200' }
      case 'Gold': return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', glow: 'shadow-sm border-amber-200' }
      case 'Silver': return { text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300', glow: 'shadow-sm border-slate-300' }
      case 'Bronze': return { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', glow: 'shadow-sm border-orange-200' }
      default: return { text: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', glow: 'shadow-none' }
    }
  }

  const lightBadge = getLightBadge(studentBadge.name)

  const todayStr = new Date().toLocaleDateString('en-CA')
  const todayLog = history.find(h => h.date === todayStr)
  const inactiveToday = !todayLog || todayLog.completedCount === 0

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white pointer-events-none" />

      {/* Main Container */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        
        {/* Back navigation button */}
        <div>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Student List
          </button>
        </div>

        {student && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Student Details & Personal Tasks */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Student Profile Card */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-extrabold shadow-md shadow-blue-500/10 shrink-0">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-slate-900 truncate">{student.name || 'Student'}</h2>
                      {student.batch && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 border border-blue-100 text-blue-600">
                          {student.batch}
                        </span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-xs text-slate-600 font-mono">
                      <Phone className="h-3 w-3 text-blue-500" />
                      {student.phone}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-semibold">
                      Registered: {new Date(student.created_at).toLocaleDateString()}
                    </span>
                    {inactiveToday && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse shrink-0 whitespace-nowrap" title="Inactive Today">
                          <AlertCircle className="h-2.5 w-2.5 shrink-0 text-red-500" />
                          Inactive Today
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7-Day Performance Metric & Badge */}
                <div className="flex items-center gap-4 bg-blue-50/60 border border-blue-100 p-4 rounded-xl">
                  <div className={`p-2.5 rounded-lg border bg-white shrink-0 ${lightBadge.text} ${lightBadge.border} ${lightBadge.glow}`}>
                    <BadgeIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      7-Day Rank Level
                    </span>
                    <span className="flex items-center gap-2 mt-0.5">
                      <span className={`text-base font-extrabold ${lightBadge.text}`}>
                        {studentBadge.name}
                      </span>
                      <span className={`text-[9px] ${lightBadge.bg} border ${lightBadge.border} px-1.5 py-0.5 rounded ${lightBadge.text} font-bold`}>
                        {studentBadge.malName}
                      </span>
                    </span>
                    <span className="block text-[11px] text-slate-600 font-semibold mt-0.5">
                      {averagePercentage}% Avg Completion
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Tasks Card for Admin */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="h-4.5 w-4.5 text-blue-600" />
                    Personal Tasks
                  </h3>
                  <span className="text-[10px] text-slate-550 font-mono font-semibold">
                    {personalTasks.filter(t => t.completed).length}/{personalTasks.length} Done
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-3">
                  {personalTasks.length > 0 ? (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                      {personalTasks.map((task) => (
                        <div 
                          key={task.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-150 ${
                            task.completed 
                              ? 'bg-blue-50/60 border-blue-200 text-blue-900' 
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 select-none">
                            <div className={`h-4.5 w-4.5 rounded border flex items-center justify-center transition-all ${
                              task.completed 
                                ? 'bg-blue-600 border-blue-600 text-white' 
                                : 'border-slate-300 bg-white'
                            }`}>
                              {task.completed && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-xs font-semibold truncate ${
                              task.completed ? 'text-slate-500 line-through font-semibold' : 'text-slate-800'
                            }`}>
                              {task.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 space-y-1">
                      <p className="text-xs text-slate-500 italic">
                        No personal tasks added by the student yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: 7-Day History Accordion */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  7-Day History Detail
                </h3>
                <span className="text-xs text-slate-500 font-semibold italic">
                  View daily task completion details
                </span>
              </div>

              {/* 7-Day Progress Graph Card */}
              {(() => {
                const chartData = [...history].reverse().map(day => {
                  const dateObj = new Date(day.date + 'T00:00:00')
                  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }) // Mon, Tue, etc.
                  const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) // Jul 12
                  const todayStr = new Date().toLocaleDateString('en-CA')
                  const isToday = day.date === todayStr

                  return {
                    day: dayName,
                    date: formattedDate,
                    percentage: day.percentage,
                    isToday
                  }
                })

                return (
                  <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-5 hover:shadow-md transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4 duration-500 delay-75">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <Calendar className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                        <span className="truncate">7-Day Completion Progress</span>
                      </h3>
                      <span className="text-[9px] sm:text-[10px] text-slate-500 font-mono font-semibold">Weekly Analytics</span>
                    </div>

                    {/* Custom SVG/CSS Bar Graph */}
                    <div className="pt-2">
                      <div className="relative flex items-end justify-between h-48 border-b border-slate-100 pb-2 px-2 gap-1 sm:gap-2">
                        {/* Background Grid Lines */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pr-1 select-none">
                          <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">100%</span></div>
                          <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">75%</span></div>
                          <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">50%</span></div>
                          <div className="w-full border-t border-slate-100/80 h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">25%</span></div>
                          <div className="w-full h-0 flex justify-end"><span className="text-[8px] text-slate-500 -mt-1.5 bg-white px-1 rounded font-mono font-semibold">0%</span></div>
                        </div>

                        {/* Bars */}
                        {chartData.map((stat, idx) => {
                          const barHeight = isCalculated ? stat.percentage : 0
                          return (
                            <div key={idx} className="flex flex-col items-center flex-1 group z-10 relative">
                              {/* Tooltip on Hover */}
                              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl font-mono text-center z-30 whitespace-nowrap">
                                <span className="block font-bold text-cyan-400">{stat.percentage}% Done</span>
                                <span className="block text-[8px] text-slate-350">{stat.date}</span>
                              </div>

                              {/* Bar Fill Wrapper */}
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
                              
                              {/* X-Axis labels */}
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
                )
              })()}

              <div className="space-y-3">
                {history.map((day) => {
                  const isExpanded = !!expandedDates[day.date]
                  const formattedDate = new Date(day.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })

                  return (
                    <div 
                      key={day.date}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
                    >
                      {/* Accordion Header */}
                      <div 
                        onClick={() => toggleDayExpansion(day.date)}
                        className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/50 transition cursor-pointer select-none"
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
                          {/* Metric info */}
                          <div className="text-right">
                            <span className="block text-xs font-bold text-slate-700">
                              {day.completedCount} / {day.totalCount} Completed
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold block mt-0.5">
                              {day.percentage}% Score
                            </span>
                          </div>

                          {/* Icon */}
                          <div className="text-slate-600 group-hover:text-slate-900">
                            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                          </div>
                        </div>
                      </div>

                      {/* Accordion Detail list with interactive toggles */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-4 sm:p-6 animate-in slide-in-from-top-1 duration-150">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {mainTasks.map((task) => {
                              const isCompleted = !!day.task_data[task.id]
                              return (
                                <div 
                                  key={task.id}
                                  className={`flex items-start gap-2.5 p-3 rounded-xl border select-none transition-all duration-150 ${
                                    isCompleted 
                                      ? 'bg-blue-50 border-blue-200 text-blue-900' 
                                      : 'bg-gray-50 border-slate-200 text-slate-700'
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 stroke-[2.5]" />
                                    ) : (
                                      <XCircle className="h-4.5 w-4.5 text-slate-400" />
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold leading-relaxed">
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
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
