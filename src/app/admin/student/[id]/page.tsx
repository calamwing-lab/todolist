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
import { StudentReportView } from '@/components/StudentReportView'
import { ScrollReveal } from '@/components/ScrollReveal'

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
        const tasksList = await getMainTasks()
        setMainTasks(tasksList)

        const res = await getStudentAdminData(studentId)
        if (!res.success || !res.student) {
          throw new Error('Student profile not found')
        }
        const profileData = res.student
        setStudent(profileData)
        setPersonalTasks(profileData.personalTasks || [])

        const dateStrings: string[] = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          dateStrings.push(d.toLocaleDateString('en-CA'))
        }

        const taskLogs = await getStudentHistoryLast7Days(studentId, dateStrings)

        const timeline: DayLog[] = taskLogs.map(log => {
          const task_data = { ...log.task_data }
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

        setHistory(timeline.reverse())

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

  const averagePercentage = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.percentage, 0) / history.length)
    : 0

  const studentBadge = getBadgeForPercentage(averagePercentage)
  const BadgeIcon = studentBadge.icon

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm font-bold text-slate-600">Loading Student History...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white pointer-events-none" />

      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full space-y-6">
        
        <ScrollReveal delay={50}>
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Student List
            </button>
          </div>
        </ScrollReveal>

        {student && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Student Details & Personal Tasks */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Student Profile Card */}
              <ScrollReveal delay={100}>
                <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-6 card-hover-effect">
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
              </ScrollReveal>

              {/* Personal Tasks Card for Admin */}
              <ScrollReveal delay={150}>
                <div className="bg-white border border-slate-200 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4 card-hover-effect">
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
              </ScrollReveal>

            </div>

            {/* Right Column: 7-Day History Accordion */}
            <div className="lg:col-span-2 space-y-4">
              <StudentReportView userId={studentId} />
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
