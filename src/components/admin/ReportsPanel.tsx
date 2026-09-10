import React, { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Users, TrendingUp, TrendingDown, AlertCircle, BarChart2, Clock, User, ExternalLink, CheckCircle2, Filter, X, Search, PieChart, Activity
} from 'lucide-react'
import { StudentReportView } from '@/components/StudentReportView'
import { ScrollReveal } from '@/components/ScrollReveal'

export type ReportFilter = { type: 'all' } | { type: 'batch'; batch: string } | { type: 'student'; studentId: string }

export interface Student {
  id: string
  phone: string
  name: string | null
  created_at: string
  avgPercentage?: number
  lastResponseDaysAgo?: number
  inactiveToday?: boolean
  batch?: string
}

interface ReportsPanelProps {
  students: Student[]
  filter: ReportFilter
  setFilter: (f: ReportFilter) => void
}

function AnimatedActivityDonut({ activePercent, activeStudents, inactiveStudents }: { activePercent: number; activeStudents: number; inactiveStudents: number }) {
  const [fillProgress, setFillProgress] = useState(0)
  const [hoveredSegment, setHoveredSegment] = useState<'active' | 'inactive' | null>(null)
  const [hoverCounterVal, setHoverCounterVal] = useState<number | null>(null)

  // 0 to 100% continuous filling animation over 1.5s (1500ms)
  useEffect(() => {
    setFillProgress(0)
    const duration = 1500
    const startTime = performance.now()

    const fillAnimation = (now: number) => {
      const elapsed = now - startTime
      const rawProgress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - rawProgress, 3)
      setFillProgress(eased)

      if (rawProgress < 1) {
        requestAnimationFrame(fillAnimation)
      }
    }

    const frameId = requestAnimationFrame(fillAnimation)
    return () => cancelAnimationFrame(frameId)
  }, [activePercent])

  // Handle hover counter transitions
  const targetHoverPct = hoveredSegment === 'active' 
    ? activePercent 
    : hoveredSegment === 'inactive' 
      ? (100 - activePercent) 
      : null

  useEffect(() => {
    if (targetHoverPct === null) {
      setHoverCounterVal(null)
      return
    }
    const duration = 300
    const startTime = performance.now()
    const startVal = hoverCounterVal ?? Math.round(activePercent * fillProgress)

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

  const curActiveRatio = (activePercent / 100) * fillProgress
  const curInactiveRatio = ((100 - activePercent) / 100) * fillProgress

  const activeDash = curActiveRatio * circumference
  const inactiveDash = curInactiveRatio * circumference
  const activeOffset = 0
  const inactiveOffset = -curActiveRatio * circumference

  const displayPercent = hoverCounterVal !== null 
    ? hoverCounterVal 
    : Math.round(activePercent * fillProgress)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-around py-2 gap-4">
      <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="14" fill="none" />
          
          {/* Active Segment (Emerald Green) */}
          <circle
            cx="50" cy="50" r="38"
            stroke="#10b981" 
            strokeWidth={hoveredSegment === 'active' ? 17 : 14} 
            fill="none"
            strokeDasharray={`${activeDash} ${circumference}`}
            strokeDashoffset={activeOffset}
            strokeLinecap="round"
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={() => setHoveredSegment('active')}
            onMouseLeave={() => setHoveredSegment(null)}
          />

          {/* Inactive Segment (Vibrant Orange) */}
          <circle
            cx="50" cy="50" r="38"
            stroke="#f97316" 
            strokeWidth={hoveredSegment === 'inactive' ? 17 : 14} 
            fill="none"
            strokeDasharray={`${inactiveDash} ${circumference}`}
            strokeDashoffset={inactiveOffset}
            strokeLinecap="round"
            className="transition-all duration-200 cursor-pointer"
            onMouseEnter={() => setHoveredSegment('inactive')}
            onMouseLeave={() => setHoveredSegment(null)}
          />
        </svg>

        {/* Center Text with animated 0-100% counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {displayPercent}%
          </span>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mt-0.5">
            {hoveredSegment === 'active' ? 'Active' : hoveredSegment === 'inactive' ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div>

      <div className="space-y-3 text-xs font-bold w-full sm:w-auto">
        <div 
          className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
            hoveredSegment === 'active' 
              ? 'bg-emerald-50 border border-emerald-300 shadow-sm translate-x-1' 
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          onMouseEnter={() => setHoveredSegment('active')}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <span className={`h-3.5 w-3.5 rounded-full bg-emerald-500 shrink-0 shadow-sm transition-transform ${hoveredSegment === 'active' ? 'scale-125 ring-2 ring-emerald-300' : ''}`} />
          <div>
            <span className="block text-slate-700">Active Students</span>
            <span className="block text-emerald-600 font-extrabold">{activeStudents} ({activePercent}%)</span>
          </div>
        </div>

        <div 
          className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 cursor-pointer ${
            hoveredSegment === 'inactive' 
              ? 'bg-orange-50 border border-orange-300 shadow-sm translate-x-1' 
              : 'hover:bg-slate-50 border border-transparent'
          }`}
          onMouseEnter={() => setHoveredSegment('inactive')}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          <span className={`h-3.5 w-3.5 rounded-full bg-orange-500 shrink-0 shadow-sm transition-transform ${hoveredSegment === 'inactive' ? 'scale-125 ring-2 ring-orange-300' : ''}`} />
          <div>
            <span className="block text-slate-700">Inactive Students</span>
            <span className="block text-orange-600 font-extrabold">{inactiveStudents} ({100 - activePercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ReportsPanel({ students, filter, setFilter }: ReportsPanelProps) {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const [studentSearchQuery, setStudentSearchQuery] = useState('')

  const filteredStudents = useMemo(() => {
    if (filter.type === 'batch') {
      return students.filter(s => s.batch === filter.batch)
    }
    return students
  }, [students, filter])

  const totalStudents = filteredStudents.length
  const activeStudents = filteredStudents.filter(s => !s.inactiveToday).length
  const inactiveStudents = totalStudents - activeStudents
  const activePercent = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0

  const criticalInactive = useMemo(() => {
    return filteredStudents.filter(s => s.inactiveToday && s.lastResponseDaysAgo !== undefined && s.lastResponseDaysAgo > 2)
      .sort((a, b) => (b.lastResponseDaysAgo || 0) - (a.lastResponseDaysAgo || 0))
  }, [filteredStudents])

  const batchStats = useMemo(() => {
    const batches = Array.from(new Set(filteredStudents.map(s => s.batch).filter(Boolean))) as string[]
    return batches.sort().map(batch => {
      const batchStudents = filteredStudents.filter(s => s.batch === batch)
      const batchActive = batchStudents.filter(s => !s.inactiveToday).length
      const pct = batchStudents.length > 0 ? Math.round((batchActive / batchStudents.length) * 100) : 0
      return { batch, total: batchStudents.length, active: batchActive, pct }
    })
  }, [filteredStudents])

  const batches = Array.from(new Set(students.map(s => s.batch).filter(Boolean))).sort() as string[]

  const selectedStudent = useMemo(() => {
    if (filter.type === 'student') {
      return students.find(s => s.id === filter.studentId) || students[0]
    }
    return null
  }, [students, filter])

  const searchedStudents = useMemo(() => {
    const query = studentSearchQuery.toLowerCase().trim()
    if (!query) return students
    return students.filter(s => 
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.batch && s.batch.toLowerCase().includes(query))
    )
  }, [students, studentSearchQuery])

  const renderFilterButton = () => (
    <div className="flex items-center gap-2 relative z-[60]">
      {filter.type === 'batch' && (
        <div className="flex items-center relative animate-in fade-in slide-in-from-right-2">
          <select
            value={filter.batch}
            onChange={(e) => setFilter({ type: 'batch', batch: e.target.value })}
            className="appearance-none bg-blue-50 border border-blue-300 text-blue-800 text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-sm hover:bg-blue-100/70 transition"
          >
            {batches.map(b => (
              <option key={b} value={b} className="bg-white text-slate-800 font-bold">{b}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-700">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      )}

      {filter.type === 'student' && (
        <div className="relative animate-in fade-in slide-in-from-right-2">
          <button
            type="button"
            onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
            className="flex items-center justify-between gap-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold rounded-xl px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer shadow-md transition-all max-w-[200px] sm:max-w-[280px] active:scale-95"
          >
            <span className="truncate flex-1 text-left">{selectedStudent ? (selectedStudent.name || selectedStudent.phone) : 'Select Student'}</span>
            <Search className="h-3.5 w-3.5 text-blue-100 shrink-0" />
          </button>

          {isStudentDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => setIsStudentDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-300 shadow-2xl ring-1 ring-slate-900/10 rounded-2xl p-3 z-[100] space-y-2 animate-in fade-in zoom-in-95 duration-150">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search student by name, phone, batch..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-inner"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                  {searchedStudents.length > 0 ? (
                    searchedStudents.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setFilter({ type: 'student', studentId: s.id })
                          setIsStudentDropdownOpen(false)
                          setStudentSearchQuery('')
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition flex items-center justify-between gap-2 cursor-pointer ${
                          s.id === selectedStudent?.id
                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                            : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                        }`}
                      >
                        <div className="truncate min-w-0">
                          <span className="block truncate font-bold">{s.name || 'Unnamed Student'}</span>
                          <span className={`block text-[10px] ${s.id === selectedStudent?.id ? 'text-blue-100' : 'text-slate-400'}`}>
                            {s.phone} {s.batch ? `• ${s.batch}` : ''}
                          </span>
                        </div>
                        {s.id === selectedStudent?.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />}
                      </button>
                    ))
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium italic">
                      No student matching "{studentSearchQuery}"
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="relative shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold border active:scale-[0.98] transition cursor-pointer shadow-sm ${
              filter.type !== 'all' 
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{filter.type === 'student' ? 'Individual' : filter.type === 'batch' ? 'Batch' : 'Filter'}</span>
          </button>
          
          {filter.type !== 'all' && (
            <button
              onClick={() => setFilter({ type: 'all' })}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 transition cursor-pointer animate-in fade-in zoom-in-95"
              title="Clear Filter"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        {isFilterPopoverOpen && (
          <>
            <div className="fixed inset-0 z-[90]" onClick={() => setIsFilterPopoverOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-300 shadow-2xl ring-1 ring-slate-900/10 rounded-2xl p-2 z-[100] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setFilter({ type: 'batch', batch: batches[0] || '' })
                  setIsFilterPopoverOpen(false)
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-between cursor-pointer ${filter.type === 'batch' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Batch
                {filter.type === 'batch' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </button>
              <button
                onClick={() => {
                  setFilter({ type: 'student', studentId: students[0]?.id || '' })
                  setIsFilterPopoverOpen(false)
                }}
                className={`w-full text-left px-3.5 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-between cursor-pointer ${filter.type === 'student' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Individual
                {filter.type === 'student' && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (filter.type === 'student') {
    return (
      <div className="space-y-6 p-6 bg-white rounded-2xl border border-blue-100 shadow-md relative z-30">
        <ScrollReveal delay={50} className="relative z-[100]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Individual Student Report
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Viewing progress and analytics for {selectedStudent ? (selectedStudent.name || selectedStudent.phone) : 'selected student'}.
              </p>
            </div>
            {renderFilterButton()}
          </div>
        </ScrollReveal>

        {selectedStudent ? (
          <div className="space-y-6 relative z-0">
            <ScrollReveal delay={100}>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-hover-effect">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-extrabold flex items-center justify-center shadow-md shrink-0">
                    <User className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-slate-900">{selectedStudent.name || 'Student'}</h3>
                      {selectedStudent.batch && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                          {selectedStudent.batch}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedStudent.phone}</p>
                  </div>
                </div>

                <Link
                  href={`/admin/student/${selectedStudent.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm active:scale-95 shrink-0"
                >
                  <span>Full Profile Page</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                </Link>
              </div>
            </ScrollReveal>

            <StudentReportView userId={selectedStudent.id} />
          </div>
        ) : (
          <div className="py-12 text-center">
            <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No student selected or available.</p>
          </div>
        )}
      </div>
    )
  }

  // ALL or BATCH mode
  return (
    <div className="space-y-6 p-6 bg-white rounded-2xl border border-blue-100 shadow-md relative z-30">
      <ScrollReveal delay={50} className="relative z-[100]">
        <div className="border-b border-slate-100 pb-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-blue-500" />
                {filter.type === 'batch' ? `Batch Report: ${filter.batch}` : 'Reports & Analytics'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {filter.type === 'batch' 
                  ? `Overview of activity and performance for batch ${filter.batch}.` 
                  : 'Overview of student activity and batch performance based on today\'s data.'}
              </p>
            </div>
            {renderFilterButton()}
          </div>
        </div>
      </ScrollReveal>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 relative z-0 items-stretch">
        <ScrollReveal delay={100} className="h-full">
          <div className="rounded-2xl border border-blue-200 p-3 sm:p-4 bg-white shadow-sm relative overflow-hidden card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-blue-600 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 min-w-0 truncate">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Total Students</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold bg-blue-50 text-blue-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-blue-200 shrink-0">Registered</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">{totalStudents}</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150} className="h-full">
          <div className="rounded-2xl border border-emerald-200 p-3 sm:p-4 bg-white shadow-sm relative overflow-hidden card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-emerald-600 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 min-w-0 truncate">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Active Today</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold bg-emerald-50 text-emerald-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">{activePercent}% Rate</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 leading-none">{activeStudents}</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200} className="h-full">
          <div className="rounded-2xl border border-orange-200 p-3 sm:p-4 bg-white shadow-sm relative overflow-hidden card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-orange-600 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 min-w-0 truncate">
                <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Inactive Today</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold bg-orange-50 text-orange-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-orange-200 shrink-0">{100 - activePercent}%</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <p className="text-2xl sm:text-3xl font-black text-orange-600 leading-none">{inactiveStudents}</p>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={250} className="h-full">
          <div className="rounded-2xl border border-red-200 p-3 sm:p-4 bg-white shadow-sm relative overflow-hidden card-hover-effect h-full flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between text-red-600 gap-1 min-h-[22px]">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 min-w-0 truncate">
                <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate">Critical (3d+)</span>
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold bg-red-50 text-red-700 px-1.5 sm:px-2 py-0.5 rounded-full border border-red-200 shrink-0">Alert</span>
            </div>
            <div className="flex items-baseline justify-between pt-2">
              <p className="text-2xl sm:text-3xl font-black text-red-600 leading-none">{criticalInactive.length}</p>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Students</span>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <div className={`grid grid-cols-1 ${filter.type === 'all' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Animated Activity Health Donut */}
        <ScrollReveal delay={300}>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between card-hover-effect h-full">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <PieChart className="h-4 w-4 text-blue-600" />
                Overall Activity Health
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">Live Status</span>
            </div>

            <AnimatedActivityDonut 
              activePercent={activePercent} 
              activeStudents={activeStudents} 
              inactiveStudents={inactiveStudents} 
            />
          </div>
        </ScrollReveal>

        {/* Batch Performance Overview */}
        {filter.type === 'all' && (
          <ScrollReveal delay={350}>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm card-hover-effect h-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Batch Performance Overview
                </h3>
                <span className="text-[10px] font-semibold text-slate-400">Live Breakdown</span>
              </div>

              {batchStats.length > 0 ? (
                <div className="space-y-4">
                  {batchStats.map(({ batch, total, active, pct }) => (
                    <div key={batch} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{batch}</span>
                          <span className="text-xs text-slate-500 font-semibold">{active}/{total} active</span>
                        </div>
                        <span className={`text-xs font-black ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            pct >= 70 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                            : pct >= 40 ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : 'bg-gradient-to-r from-red-400 to-red-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic text-center py-6">No batches assigned yet.</p>
              )}
            </div>
          </ScrollReveal>
        )}
      </div>

      {/* Inactive Alert List */}
      <ScrollReveal delay={400}>
        <div className="bg-white rounded-2xl border border-red-200 p-6 space-y-4 shadow-sm card-hover-effect">
          <div className="flex items-center justify-between border-b border-red-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" />
              Inactive Alert List <span className="ml-1 text-red-500">(3+ Days)</span>
            </h3>
            <span className="text-xs bg-red-100 border border-red-200 text-red-600 px-2.5 py-0.5 rounded-full font-bold">
              {criticalInactive.length} student{criticalInactive.length !== 1 ? 's' : ''}
            </span>
          </div>
          {criticalInactive.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {criticalInactive.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 gap-4 hover:bg-slate-50/50 px-2 rounded-xl transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{s.name || 'Unnamed'}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.phone}</p>
                    </div>
                    {s.batch && (
                      <span className="hidden sm:inline text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                        {s.batch}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1 rounded-full shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {s.lastResponseDaysAgo} day{s.lastResponseDaysAgo !== 1 ? 's' : ''} inactive
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium">No students have been inactive for 3+ days. Great progress!</p>
            </div>
          )}
        </div>
      </ScrollReveal>
    </div>
  )
}
