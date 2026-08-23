import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { 
  Users, TrendingUp, TrendingDown, AlertCircle, BarChart2, Clock, User, ExternalLink, CheckCircle2, Filter, X, Search
} from 'lucide-react'
import { getBadgeForPercentage } from '@/utils/badge'

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

export function ReportsPanel({ students, filter, setFilter }: ReportsPanelProps) {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)
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

  // Batch breakdown (Only when type === 'all')
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

  const renderFilterButton = () => (
    <div className="flex items-center gap-2">
      {filter.type === 'batch' && (
        <div className="flex items-center relative animate-in fade-in slide-in-from-right-2">
          <select
            value={filter.batch}
            onChange={(e) => setFilter({ type: 'batch', batch: e.target.value })}
            className="appearance-none bg-blue-50 border border-blue-200 text-blue-700 text-xs sm:text-sm font-bold rounded-xl px-3 py-1.5 sm:py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            {batches.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-700">
            <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      )}

      <div className="relative shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsFilterPopoverOpen(!isFilterPopoverOpen)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border active:scale-[0.98] transition cursor-pointer ${
              filter.type !== 'all' 
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-500' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{filter.type === 'student' ? 'Individual' : filter.type === 'batch' ? 'Batch' : 'Filter'}</span>
          </button>
          
          {filter.type !== 'all' && (
            <button
              onClick={() => setFilter({ type: 'all' })}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-red-600 border border-transparent hover:border-red-200 transition cursor-pointer animate-in fade-in zoom-in-95"
              title="Clear Filter"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>

        {isFilterPopoverOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsFilterPopoverOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 z-50 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={() => {
                  setFilter({ type: 'batch', batch: batches[0] || '' })
                  setIsFilterPopoverOpen(false)
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-between ${filter.type === 'batch' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Batch
                {filter.type === 'batch' && <CheckCircle2 className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  setFilter({ type: 'student', studentId: '' })
                  setIsFilterPopoverOpen(false)
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-between ${filter.type === 'student' ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                Individual
                {filter.type === 'student' && <CheckCircle2 className="h-4 w-4" />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (filter.type === 'student') {
    const displayedStudents = students
      .filter(s => {
        const query = studentSearchQuery.toLowerCase()
        return (s.name?.toLowerCase().includes(query)) || (s.phone.includes(query)) || (s.batch?.toLowerCase().includes(query))
      })
      .slice()
      .sort((a,b) => (a.name || '').localeCompare(b.name || ''))

    return (
      <div className="space-y-4 p-6 bg-white rounded-2xl border border-blue-100 shadow-md">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div className="shrink-0">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" />
              Individual Students
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Select a student to view their detailed report.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-end">
            <div className="relative w-full sm:w-64 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search by name, phone..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
              />
            </div>
            {renderFilterButton()}
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {displayedStudents.length > 0 ? (
            displayedStudents.map(s => (
              <Link 
                href={`/admin/student/${s.id}`} 
                key={s.id}
                className="flex items-center justify-between p-4 hover:bg-blue-50/50 transition group rounded-xl border border-transparent hover:border-blue-100"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-slate-500 group-hover:text-blue-500 transition" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 group-hover:text-blue-700 transition">{s.name || s.phone}</div>
                    {s.batch && (
                      <div className="text-xs font-semibold text-slate-500 mt-0.5">{s.batch}</div>
                    )}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition" />
              </Link>
            ))
          ) : (
            <div className="py-12 text-center">
              <User className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No students found matching "{studentSearchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ALL or BATCH mode
  return (
    <div className="space-y-6 p-6 bg-white rounded-2xl border border-blue-100 shadow-md">
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

      {/* Top Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Active Today', value: activeStudents, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Inactive Today', value: inactiveStudents, icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
          { label: 'Critical (3d+)', value: criticalInactive.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border p-4 ${bg} ${border}`}>
            <div className={`flex items-center gap-2 mb-1.5 ${color}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
            </div>
            <p className={`text-3xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className={`grid grid-cols-1 ${filter.type === 'all' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Overall Activity Card */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Overall Activity Today</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-emerald-600">Active</span>
              <span className="text-emerald-700 font-black">{activePercent}%</span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${activePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-500 font-medium">
              <span>{activeStudents} active</span>
              <span>{inactiveStudents} inactive</span>
            </div>
          </div>
        </div>

        {/* Batch Performance (Only in 'all' view) */}
        {filter.type === 'all' && (
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Batch Performance Today</h3>
            {batchStats.length > 0 ? (
              <div className="space-y-4">
                {batchStats.map(({ batch, total, active, pct }) => (
                  <div key={batch} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{batch}</span>
                        <span className="text-xs text-slate-500">{active}/{total} active</span>
                      </div>
                      <span className={`text-xs font-black ${pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
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
        )}
      </div>

      {/* Inactive Alert List */}
      <div className="bg-slate-50 rounded-2xl border border-red-100 p-6 space-y-4">
        <div className="flex items-center justify-between">
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
            {criticalInactive.map(s => (
              <div key={s.id} className="flex items-center justify-between py-3 gap-4">
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
    </div>
  )
}
