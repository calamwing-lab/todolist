'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  getCurrentUser, logout, getStudents, getVideos, 
  addVideo, deleteVideo, resetStudentPasswordLocal, addStudentLocal,
  getStudentHistoryLast7Days, updateUserProfileLocal, deleteStudentLocal,
  getMainTasks, MainTask, addMainTaskLocal, updateMainTaskLocal, deleteMainTaskLocal,
  getLeaderboard, LeaderboardEntry
} from '@/utils/db'
import { changeAdminPassword, getStudentsAdminData } from '@/app/admin/actions'
import { 
  Search, ExternalLink, Trash2, CheckCircle2, AlertCircle, User, Edit, Trophy, Download, Lock, Eye, EyeOff, X, Smartphone, Check, Loader2, Shield, LogOut, Users, Video, Plus, Key
} from 'lucide-react'
import { getBadgeForPercentage } from '@/utils/badge'

interface Student {
  id: string
  phone: string
  name: string | null
  created_at: string
  avgPercentage?: number
  lastResponseDaysAgo?: number
  inactiveToday?: boolean
  batch?: string
}

interface VideoRecord {
  id: string
  url: string
  description: string | null
  created_at: string
}

export default function AdminPage() {
  const router = useRouter()
  
  // Navigation & Page State
  const [loading, setLoading] = useState(true)
  const [adminPhone, setAdminPhone] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminId, setAdminId] = useState('')

  // Students State
  const [students, setStudents] = useState<Student[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [resettingStudent, setResettingStudent] = useState<Student | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)

  // Edit Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [editStudentName, setEditStudentName] = useState('')
  const [editStudentPhone, setEditStudentPhone] = useState('')
  const [editStudentBatch, setEditStudentBatch] = useState('HS1')
  const [editStudentLoading, setEditStudentLoading] = useState(false)
  const [editStudentError, setEditStudentError] = useState<string | null>(null)
  const [editStudentSuccess, setEditStudentSuccess] = useState<string | null>(null)

  // Edit Admin Modal State
  const [isEditAdminOpen, setIsEditAdminOpen] = useState(false)
  const [editAdminName, setEditAdminName] = useState('')
  const [editAdminPhone, setEditAdminPhone] = useState('')
  const [editAdminLoading, setEditAdminLoading] = useState(false)
  const [editAdminError, setEditAdminError] = useState<string | null>(null)
  const [editAdminSuccess, setEditAdminSuccess] = useState<string | null>(null)

  // Change Admin Password Modal State
  const [isChangePassOpen, setIsChangePassOpen] = useState(false)
  const [changePassCurrent, setChangePassCurrent] = useState('')
  const [changePassNew, setChangePassNew] = useState('')
  const [changePassConfirm, setChangePassConfirm] = useState('')

  const [changePassLoading, setChangePassLoading] = useState(false)
  const [changePassError, setChangePassError] = useState<string | null>(null)
  const [changePassSuccess, setChangePassSuccess] = useState<string | null>(null)

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false)
  const [newStudentName, setNewStudentName] = useState('')
  const [newStudentPhone, setNewStudentPhone] = useState('')
  const [newStudentPassword, setNewStudentPassword] = useState('')
  const [newStudentBatch, setNewStudentBatch] = useState('HS1')
  const [addStudentLoading, setAddStudentLoading] = useState(false)
  const [addStudentError, setAddStudentError] = useState<string | null>(null)
  const [addStudentSuccess, setAddStudentSuccess] = useState<string | null>(null)
  
  // Password Visibility States
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [showAddStudentPassword, setShowAddStudentPassword] = useState(false)
  const [showChangePassCurrent, setShowChangePassCurrent] = useState(false)
  const [showChangePassNew, setShowChangePassNew] = useState(false)
  const [showChangePassConfirm, setShowChangePassConfirm] = useState(false)

  // Videos State
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [videoUrl, setVideoUrl] = useState('')
  const [videoDesc, setVideoDesc] = useState('')
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [videoSuccess, setVideoSuccess] = useState<string | null>(null)

  // Tab state (for mobile responsiveness or section focus)
  const [activeSection, setActiveSection] = useState<'students' | 'videos' | 'tasks'>('students')

  // Main Tasks State
  const [mainTasks, setMainTasks] = useState<MainTask[]>([])
  const [newTaskLabel, setNewTaskLabel] = useState('')
  const [editingTask, setEditingTask] = useState<MainTask | null>(null)
  const [editingTaskLabel, setEditingTaskLabel] = useState('')
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSuccess, setTaskSuccess] = useState<string | null>(null)

  // Leaderboard / Toppers state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

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

  // Custom Delete Warning Modal State
  const [deletingItem, setDeletingItem] = useState<{
    id: string
    type: 'student' | 'task' | 'video'
    title: string
    message: string
  } | null>(null)

  const loadStudentsWithStats = async () => {
    const dateStrings: string[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dateStrings.push(d.toLocaleDateString('en-CA')) // YYYY-MM-DD format
    }

    const res = await getStudentsAdminData(dateStrings)
    const studentList = res.success && res.students ? res.students : []
    const mainTasksList = await getMainTasks()
    const totalTasksCount = mainTasksList.length || 1

    const studentsWithStats = studentList.map((s: any) => {
      // Build logs in memory from the pre-fetched dailyTasks
      const historyMap = new Map<string, any>()
      if (s.dailyTasks) {
        s.dailyTasks.forEach((item: any) => {
          historyMap.set(item.date, item)
        })
      }

      const logs = dateStrings.map(date => {
        return historyMap.get(date) || {
          id: '',
          user_id: s.id,
          date,
          task_data: {}
        }
      })

      const totalPercentage = logs.reduce((sum, log) => {
        const completed = mainTasksList.filter(item => log.task_data[item.id]).length
        const pct = Math.round((completed / totalTasksCount) * 100)
        return sum + pct
      }, 0)
      const avg = Math.round(totalPercentage / 7)

      return {
        ...s,
        avgPercentage: avg
      }
    })

    return studentsWithStats
  }

  const fetchData = async () => {
    try {
      const user = getCurrentUser()
      if (!user || user.role !== 'admin') {
        router.replace('/login')
        return
      }

      // If the cached user ID is not a valid UUID (e.g. from an old session), force re-login
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(user.id)) {
        handleLogout()
        return
      }

      setAdminPhone(user.phone || '')
      setAdminName(user.name || 'System Admin')
      setAdminId(user.id)

      // 1. Fetch Students with stats
      const studentList = await loadStudentsWithStats()
      setStudents(studentList)

      // 2. Fetch Videos
      const videoList = await getVideos()
      setVideos(videoList)

      // 3. Fetch Main Tasks
      const tasksList = await getMainTasks()
      setMainTasks(tasksList)

      // 4. Fetch Toppers Leaderboard
      const boardData = await getLeaderboard()
      setLeaderboard(boardData)


    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleLogout = async () => {
    logout()
    router.replace('/login')
  }

  // Filter students based on search
  const filteredStudents = students.filter(student => {
    const name = student.name?.toLowerCase() || ''
    const phone = student.phone.toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || phone.includes(query)
  })

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resettingStudent) return
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.')
      return
    }

    setResetLoading(true)
    setResetError(null)
    setResetSuccess(null)

    const result = await resetStudentPasswordLocal(resettingStudent.id, newPassword)

    if (result.success) {
      setResetSuccess(`Password for ${resettingStudent.name || resettingStudent.phone} updated successfully!`)
      setNewPassword('')
      setTimeout(() => {
        setResettingStudent(null)
        setResetSuccess(null)
      }, 2500)
    } else {
      setResetError(result.error || 'Failed to reset password.')
    }
    setResetLoading(false)
  }

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()

    // Only name and password are strictly required
    if (!newStudentName.trim()) {
      setAddStudentError('Student name is required.')
      return
    }
    if (!newStudentPassword) {
      setAddStudentError('Password is required.')
      return
    }
    if (newStudentPassword.length < 6) {
      setAddStudentError('Password must be at least 6 characters long.')
      return
    }

    // If admin provided a phone number, validate it's exactly 10 digits
    if (newStudentPhone.trim()) {
      const digitsOnly = newStudentPhone.trim().replace(/\D/g, '')
      if (digitsOnly.length !== 10) {
        setAddStudentError('Phone number must be exactly 10 digits (no country code). Leave blank to auto-generate.')
        return
      }
    }

    setAddStudentLoading(true)
    setAddStudentError(null)
    setAddStudentSuccess(null)

    const result = await addStudentLocal(newStudentName, newStudentPhone, newStudentPassword, newStudentBatch)

    if (result.success) {
      const displayPhone = result.student?.phone || 'auto-generated'
      setAddStudentSuccess(`Student added! Login ID: ${displayPhone}`)
      setNewStudentName('')
      setNewStudentPhone('')
      setNewStudentPassword('')
      setNewStudentBatch('HS1')
      // Refresh list
      const studentList = await loadStudentsWithStats()
      setStudents(studentList)

      // Refresh leaderboard
      setLeaderboard(await getLeaderboard())

      setTimeout(() => {
        setIsAddStudentOpen(false)
        setAddStudentSuccess(null)
      }, 3000)
    } else {
      setAddStudentError(result.error || 'Failed to add student.')
    }
    setAddStudentLoading(false)
  }

  // Handle Video Upload
  const handleVideoUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl) {
      setVideoError('YouTube URL is required.')
      return
    }

    // Basic YouTube url validation
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/
    if (!ytRegex.test(videoUrl.trim())) {
      setVideoError('Please enter a valid YouTube link.')
      return
    }

    setVideoLoading(true)
    setVideoError(null)
    setVideoSuccess(null)

    try {
      const newVid = await addVideo(videoUrl.trim(), videoDesc.trim())

      setVideoSuccess('Video added successfully!')
      setVideoUrl('')
      setVideoDesc('')
      setVideos([newVid, ...videos])

      setTimeout(() => setVideoSuccess(null), 3000)
    } catch (err: any) {
      setVideoError(err.message || 'Failed to add video record.')
    } finally {
      setVideoLoading(false)
    }
  }


  // Handle Video Delete Request
  const handleDeleteVideo = (id: string, description: string | null) => {
    setDeletingItem({
      id,
      type: 'video',
      title: 'Delete Video Record?',
      message: `Are you sure you want to permanently remove this video record: "${description || 'Untitled Video'}"?`
    })
  }

  // Handle Open Edit Student Modal
  const handleOpenEditStudentModal = (student: Student) => {
    setEditingStudent(student)
    setEditStudentName(student.name || '')
    setEditStudentPhone(student.phone)
    setEditStudentBatch(student.batch || 'HS1')
    setEditStudentError(null)
    setEditStudentSuccess(null)
  }

  // Handle Edit Student Submit
  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudent) return
    if (!editStudentName.trim() || !editStudentPhone.trim()) {
      setEditStudentError('All fields are required.')
      return
    }

    setEditStudentLoading(true)
    setEditStudentError(null)
    setEditStudentSuccess(null)

    const result = await updateUserProfileLocal(editingStudent.id, editStudentName, editStudentPhone, editStudentBatch)

    if (result.success) {
      setEditStudentSuccess('Student profile updated successfully!')
      // Refresh list
      const studentList = await loadStudentsWithStats()
      setStudents(studentList)

      // Refresh leaderboard
      setLeaderboard(await getLeaderboard())

      setTimeout(() => {
        setEditingStudent(null)
        setEditStudentSuccess(null)
      }, 2000)
    } else {
      setEditStudentError(result.error || 'Failed to update student profile.')
    }
    setEditStudentLoading(false)
  }

  // Handle Open Edit Admin Modal
  const handleOpenEditAdminModal = () => {
    setEditAdminName(adminName)
    setEditAdminPhone(adminPhone)
    setEditAdminError(null)
    setEditAdminSuccess(null)
    setIsEditAdminOpen(true)
  }

  // Handle Edit Admin Submit
  const handleEditAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId) return
    if (!editAdminName.trim() || !editAdminPhone.trim()) {
      setEditAdminError('All fields are required.')
      return
    }

    setEditAdminLoading(true)
    setEditAdminError(null)
    setEditAdminSuccess(null)

    const result = await updateUserProfileLocal(adminId, editAdminName, editAdminPhone)

    if (result.success) {
      setEditAdminSuccess('Admin profile updated successfully!')
      setAdminName(editAdminName.trim())
      setAdminPhone(editAdminPhone.trim())

      setTimeout(() => {
        setIsEditAdminOpen(false)
        setEditAdminSuccess(null)
      }, 2000)
    } else {
      setEditAdminError(result.error || 'Failed to update admin profile.')
    }
    setEditAdminLoading(false)
  }


  // Handle Change Admin Password
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminId) return

    if (!changePassCurrent.trim()) {
      setChangePassError('Please enter your current password.')
      return
    }
    if (changePassNew.length < 6) {
      setChangePassError('New password must be at least 6 characters.')
      return
    }
    if (changePassNew !== changePassConfirm) {
      setChangePassError('New passwords do not match.')
      return
    }
    if (changePassNew === changePassCurrent) {
      setChangePassError('New password must be different from the current one.')
      return
    }

    setChangePassLoading(true)
    setChangePassError(null)
    setChangePassSuccess(null)

    const result = await changeAdminPassword(adminId, changePassNew)
    if (result.success) {
      setChangePassSuccess('Password changed successfully!')
      setChangePassCurrent('')
      setChangePassNew('')
      setChangePassConfirm('')
      setTimeout(() => {
        setIsChangePassOpen(false)
        setChangePassSuccess(null)
      }, 2000)
    } else {
      setChangePassError(result.error || 'Failed to change password.')
    }
    setChangePassLoading(false)
  }

  // Handle Delete Student Request
  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setDeletingItem({
      id: studentId,
      type: 'student',
      title: 'Delete Student Account?',
      message: `Are you sure you want to permanently delete the student account for "${studentName}"? This action cannot be undone and will delete all their tracking records.`
    })
  }

  // Handle Add Main Task
  const handleAddMainTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskLabel.trim()) {
      setTaskError('Task label cannot be empty.')
      return
    }
    
    setTaskError(null)
    setTaskSuccess(null)
    
    const result = await addMainTaskLocal(newTaskLabel.trim())
    if (result.success && result.task) {
      setTaskSuccess('Task added successfully!')
      setNewTaskLabel('')
      setMainTasks([...mainTasks, result.task])
      // Refresh students stats to reflect new task count
      setStudents(await loadStudentsWithStats())
      // Refresh leaderboard
      setLeaderboard(await getLeaderboard())
      setTimeout(() => setTaskSuccess(null), 3000)
    } else {
      setTaskError(result.error || 'Failed to add task.')
    }
  }

  // Handle Edit Main Task click
  const handleStartEditTask = (task: MainTask) => {
    setEditingTask(task)
    setEditingTaskLabel(task.label)
    setTaskError(null)
    setTaskSuccess(null)
  }

  // Handle Save Main Task
  const handleSaveMainTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTask) return
    if (!editingTaskLabel.trim()) {
      setTaskError('Task label cannot be empty.')
      return
    }

    setTaskError(null)
    setTaskSuccess(null)

    const result = await updateMainTaskLocal(editingTask.id, editingTaskLabel.trim())
    if (result.success) {
      setTaskSuccess('Task updated successfully!')
      setMainTasks(mainTasks.map(t => t.id === editingTask.id ? { ...t, label: editingTaskLabel.trim() } : t))
      setEditingTask(null)
      // Refresh students stats
      setStudents(await loadStudentsWithStats())
      // Refresh leaderboard
      setLeaderboard(await getLeaderboard())
      setTimeout(() => setTaskSuccess(null), 3000)
    } else {
      setTaskError(result.error || 'Failed to update task.')
    }
  }

  // Handle Delete Main Task Request
  const handleDeleteMainTask = (id: string, label: string) => {
    setDeletingItem({
      id,
      type: 'task',
      title: 'Delete Main Task?',
      message: `Are you sure you want to delete the main task: "${label}"? This will remove this task from all students and all dates.`
    })
  }

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem) return
    const { id, type } = deletingItem
    setDeletingItem(null)

    if (type === 'student') {
      const result = await deleteStudentLocal(id)
      if (result.success) {
        setStudents(await loadStudentsWithStats())
        setLeaderboard(await getLeaderboard())
      } else {
        alert(result.error || 'Failed to delete student.')
      }
    } else if (type === 'task') {
      const result = await deleteMainTaskLocal(id)
      if (result.success) {
        setTaskSuccess('Task deleted successfully!')
        setMainTasks(mainTasks.filter(t => t.id !== id))
        setStudents(await loadStudentsWithStats())
        setLeaderboard(await getLeaderboard())
        setTimeout(() => setTaskSuccess(null), 3000)
      } else {
        setTaskError(result.error || 'Failed to delete task.')
      }
    } else if (type === 'video') {
      try {
        await deleteVideo(id)
        setVideos(videos.filter(v => v.id !== id))
      } catch (err: any) {
        alert(err.message || 'Failed to delete video.')
      }
    }
  }


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <span className="text-sm text-slate-500 font-medium">Loading Admin Workspace...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-white pointer-events-none" />

      {/* Header */}
      <header className="relative z-30 border-b border-blue-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-md shadow-blue-500/10 shrink-0">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-black truncate">
                  Daily Tracking
                </span>
                <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-900 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                  Admin
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
              {showInstallBtn && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-transparent hover:bg-slate-100 border border-slate-300 hover:border-slate-400 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold active:scale-[0.98] transition cursor-pointer text-black shrink-0"
                  title="Install App"
                >
                  <Download className="h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0 text-black" />
                  <span className="hidden sm:inline">Install App</span>
                </button>
              )}
              <div className="hidden md:flex flex-col items-end text-right gap-0.5">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer hover:text-blue-600 transition" onClick={handleOpenEditAdminModal}>
                  {adminName}
                  <Edit className="h-3 w-3 text-slate-500" />
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setChangePassError(null)
                    setChangePassSuccess(null)
                    setChangePassCurrent('')
                    setChangePassNew('')
                    setChangePassConfirm('')
                    setIsChangePassOpen(true)
                  }}
                  className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer mt-0.5"
                  title="Change Password"
                >
                  <Lock className="h-2.5 w-2.5" />
                  Change Password
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-slate-50 hover:bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold border border-slate-200 hover:border-slate-300 active:scale-[0.98] transition cursor-pointer text-slate-700"
              >
                <LogOut className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="relative z-10 flex-1 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full">
        {/* Navigation Tabs (Mobile) / Sections */}
        <div className="flex border-b border-blue-100 mb-8 gap-2 sm:gap-4 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveSection('students')}
            className={`flex items-center gap-2 pb-4 pt-2 border-b-2 text-sm font-bold transition-all px-2 cursor-pointer shrink-0 ${
              activeSection === 'students' 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Students List</span>
            <span className="sm:hidden">Students</span>
          </button>
          <button
            onClick={() => setActiveSection('videos')}
            className={`flex items-center gap-2 pb-4 pt-2 border-b-2 text-sm font-bold transition-all px-2 cursor-pointer shrink-0 ${
              activeSection === 'videos' 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Video className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Video Management</span>
            <span className="sm:hidden">Videos</span>
          </button>
          <button
            onClick={() => setActiveSection('tasks')}
            className={`flex items-center gap-2 pb-4 pt-2 border-b-2 text-sm font-bold transition-all px-2 cursor-pointer shrink-0 ${
              activeSection === 'tasks' 
                ? 'border-blue-600 text-blue-700' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Main Tasks Management</span>
            <span className="sm:hidden">Main Tasks</span>
          </button>
        </div>

        {/* Section 1: Students Management */}
        {activeSection === 'students' && (
          <div className="space-y-6">
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-sm p-5 sm:p-6 rounded-xl border border-blue-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  Registered Students
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage login accounts and reset passwords. Passwords are securely isolated.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 shadow-sm transition"
                  />
                </div>
                <button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold active:scale-[0.98] transition cursor-pointer text-white"
                >
                  <Plus className="h-4 w-4" />
                  Add Student
                </button>
              </div>
            </div>

            {/* Grid Layout: Students Table + Toppers / Leaderboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              
              {/* Registered Students Section */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* Desktop View Table: Hidden on Mobile */}
                <div className="hidden md:block overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-md">
                  <table className="min-w-full divide-y divide-blue-50 text-left text-sm">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th scope="col" className="px-3 xl:px-4 py-4">Student Name</th>
                        <th scope="col" className="px-3 xl:px-4 py-4">Phone Number</th>
                        <th scope="col" className="px-3 xl:px-4 py-4">Registration Date</th>
                        <th scope="col" className="px-3 xl:px-4 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50 text-slate-600">
                      {filteredStudents.length > 0 ? (
                        filteredStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-blue-50/50 transition-colors">
                            <td className="px-3 xl:px-4 py-4.5 font-semibold text-slate-800 align-top">
                              <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link href={`/admin/student/${student.id}`} className="text-blue-600 hover:text-blue-700 hover:underline transition">
                                    {student.name || 'John Doe'}
                                  </Link>
                                  {student.batch && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600">
                                      {student.batch}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {student.avgPercentage !== undefined && (() => {
                                    const badge = getBadgeForPercentage(student.avgPercentage)
                                    const BadgeIcon = badge.icon
                                    return (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.borderClass} ${badge.colorClass} shrink-0 whitespace-nowrap`}>
                                        <BadgeIcon className="h-3 w-3 shrink-0" />
                                        {badge.name} ({student.avgPercentage}%)
                                      </span>
                                    )
                                  })()}
                                  {student.inactiveToday && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse shrink-0 whitespace-nowrap" title="Inactive Today">
                                      <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
                                      Inactive Today
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 xl:px-4 py-4.5 font-mono text-slate-600 align-top">
                              {student.phone}
                            </td>
                            <td className="px-3 xl:px-4 py-4.5 text-xs text-slate-500 align-top">
                              {new Date(student.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 xl:px-4 py-4.5 text-right align-top">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditStudentModal(student)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 text-[11px] px-2.5 py-1 font-semibold active:scale-[0.98] transition cursor-pointer"
                                >
                                  <Edit className="h-3 w-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => setResettingStudent(student)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] px-2.5 py-1 font-semibold active:scale-[0.98] transition cursor-pointer"
                                >
                                  <Key className="h-3 w-3" />
                                  Reset
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id, student.name || student.phone)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-[11px] px-2.5 py-1 font-semibold active:scale-[0.98] transition cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-10 text-center text-slate-500 font-medium">
                            No students found matching your search.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View: List of Cards */}
                <div className="block md:hidden space-y-4">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <div key={student.id} className="bg-white border border-blue-100 p-5 sm:p-6 rounded-2xl space-y-4 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/admin/student/${student.id}`} className="text-blue-600 hover:text-blue-700 hover:underline transition font-bold text-base">
                              {student.name || 'John Doe'}
                            </Link>
                            {student.batch && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-600">
                                {student.batch}
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            {student.avgPercentage !== undefined && (() => {
                              const badge = getBadgeForPercentage(student.avgPercentage)
                              const BadgeIcon = badge.icon
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.borderClass} ${badge.colorClass} shrink-0 whitespace-nowrap`}>
                                  <BadgeIcon className="h-3 w-3 shrink-0" />
                                  {badge.name} ({student.avgPercentage}%)
                                </span>
                              )
                            })()}
                            {student.inactiveToday && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 animate-pulse shrink-0 whitespace-nowrap" title="Inactive Today">
                                <AlertCircle className="h-3 w-3 shrink-0 text-red-500" />
                                Inactive Today
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Phone</span>
                            <span className="font-mono text-slate-800 mt-0.5 block">{student.phone}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Registered</span>
                            <span className="text-slate-600 mt-0.5 block">{new Date(student.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end">
                          <button
                            onClick={() => handleOpenEditStudentModal(student)}
                            className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-700 text-xs px-3 py-1.5 font-semibold active:scale-[0.98] transition cursor-pointer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            onClick={() => setResettingStudent(student)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs px-3 py-1.5 font-semibold active:scale-[0.98] transition cursor-pointer"
                          >
                            <Key className="h-3.5 w-3.5" />
                            Reset
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id, student.name || student.phone)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs px-3 py-1.5 font-semibold active:scale-[0.98] transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-500 italic">
                      No students found matching your search.
                    </div>
                  )}
                </div>

              </div>

              {/* Toppers / Leaderboard Panel */}
              <div className="lg:col-span-1 bg-white border border-blue-100 rounded-2xl p-6 sm:p-8 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="h-4.5 w-4.5 text-yellow-500" />
                    Toppers Leaderboard
                  </h3>
                  <span className="text-[10px] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-500 font-bold uppercase tracking-wider">
                    7-Day Avg
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar space-y-2 pt-2">
                  {leaderboard.length > 0 ? (
                    leaderboard.slice(0, 10).map((entry, idx) => {
                      const badge = getBadgeForPercentage(entry.avgPercentage)
                      const BadgeIcon = badge.icon
                      const rank = idx + 1
                      
                      // Rank visual styling
                      let rankBg = 'bg-slate-100 border-slate-200 text-slate-500'
                      if (rank === 1) rankBg = 'bg-yellow-50 border-yellow-200 text-yellow-600'
                      if (rank === 2) rankBg = 'bg-slate-100 border-slate-300 text-slate-600'
                      if (rank === 3) rankBg = 'bg-amber-50 border-amber-200 text-amber-700'

                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-blue-200 hover:shadow-sm transition duration-150"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`text-xs font-mono w-6 h-6 flex items-center justify-center rounded-lg border font-bold shrink-0 ${rankBg}`}>
                              {rank}
                            </span>
                            <div className="min-w-0">
                              <Link 
                                href={`/admin/student/${entry.id}`}
                                className="text-sm font-bold text-slate-800 hover:text-blue-600 hover:underline transition truncate block"
                              >
                                {entry.name}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold ${badge.colorClass}`}>
                                  <BadgeIcon className="h-2.5 w-2.5 shrink-0" />
                                  {badge.name}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {entry.avgPercentage}%
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-slate-500 italic">No rankings available yet.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Section 2: Video Management */}
        {activeSection === 'videos' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-blue-100 p-6 sm:p-8 rounded-2xl shadow-md space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-blue-400" />
                    Add Video Resource
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Upload new learning videos. These will be viewable by students instantly.
                  </p>
                </div>

                <form onSubmit={handleVideoUpload} className="space-y-4">
                  {videoError && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                      <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                      <span>{videoError}</span>
                    </div>
                  )}

                  {videoSuccess && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                      <span>{videoSuccess}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="url" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      YouTube URL
                    </label>
                    <input
                      type="url"
                      id="url"
                      required
                      placeholder="e.g. https://www.youtube.com/watch?v=..."
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="mt-1.5 block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="desc" className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Description / Title
                    </label>
                    <textarea
                      id="desc"
                      rows={3}
                      placeholder="Give a brief summary of the video topic..."
                      value={videoDesc}
                      onChange={(e) => setVideoDesc(e.target.value)}
                      className="mt-1.5 block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-sm resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={videoLoading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {videoLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Save Video'
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* List Column */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-400" />
                Active Video Library ({videos.length})
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.length > 0 ? (
                  videos.map((vid) => (
                    <div 
                      key={vid.id} 
                      className="group bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 shadow-sm p-5 sm:p-6 rounded-2xl flex flex-col justify-between transition-all"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs text-red-500 font-bold tracking-wider uppercase">
                            <Video className="h-3.5 w-3.5" />
                            YouTube Link
                          </span>
                          <button
                            onClick={() => handleDeleteVideo(vid.id, vid.description)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 line-clamp-2">
                          {vid.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                        <a
                          href={vid.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:text-blue-500 transition"
                        >
                          Watch Video
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-[10px] text-slate-500">
                          {new Date(vid.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-12 border border-dashed border-slate-300 bg-slate-50 rounded-2xl text-slate-500 font-medium">
                    No videos uploaded yet. Use the form to add YouTube materials.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Main Tasks Management */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            
            {/* Grid Layout: Left Column (Add task form), Right Column (List of tasks) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Add / Edit Task Form Card */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-blue-100 p-6 sm:p-8 rounded-2xl shadow-md space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    {editingTask ? (
                      <>
                        <Edit className="h-4.5 w-4.5 text-blue-600" />
                        Edit Main Task
                      </>
                    ) : (
                      <>
                        <Plus className="h-4.5 w-4.5 text-cyan-600" />
                        Add New Main Task
                      </>
                    )}
                  </h3>
                  
                  {taskError && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-red-50 border-red-200 text-red-600 text-xs">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{taskError}</span>
                    </div>
                  )}
                  
                  {taskSuccess && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-600 text-xs animate-in fade-in duration-200">
                      <CheckCircle2 className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                      <span>{taskSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={editingTask ? handleSaveMainTask : handleAddMainTask} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Task Label / Description
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Prayed Fajr, Recited Quran, Read a library book..."
                        value={editingTask ? editingTaskLabel : newTaskLabel}
                        onChange={(e) => editingTask ? setEditingTaskLabel(e.target.value) : setNewTaskLabel(e.target.value)}
                        maxLength={100}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                      />
                    </div>

                    <div className="flex gap-2.5">
                      {editingTask ? (
                        <>
                          <button
                            type="submit"
                            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-[0.96] transition cursor-pointer text-center text-xs"
                          >
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTask(null)
                              setTaskError(null)
                              setTaskSuccess(null)
                            }}
                            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-bold rounded-xl border border-slate-300 active:scale-[0.96] transition cursor-pointer text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="submit"
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-[0.96] transition cursor-pointer text-center text-xs flex items-center justify-center gap-1.5"
                        >
                          <Plus className="h-4 w-4 stroke-[3]" />
                          Add Task
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>

              {/* Tasks List Card */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span>Main Tasks List</span>
                    <span className="text-xs bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full text-slate-500 font-mono">
                      {mainTasks.length} Tasks
                    </span>
                  </h2>
                </div>

                <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden shadow-md">
                  {mainTasks.length > 0 ? (
                    <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-0.5 custom-scrollbar">
                      {mainTasks.map((task, idx) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-5 sm:p-6 hover:bg-blue-50/50 transition group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 border border-slate-200 w-6 h-6 flex items-center justify-center rounded-lg font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {task.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 opacity-80 group-hover:opacity-100 transition">
                            <button
                              onClick={() => handleStartEditTask(task)}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                              title="Edit Task Label"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMainTask(task.id, task.label)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                              title="Delete Task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-slate-700 mx-auto stroke-[1.5]" />
                      <p className="text-sm text-slate-500 italic">No main tasks defined. Add tasks to get started.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Password Reset Modal */}
      {resettingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-400" />
              Reset Student Password
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Updating password for <strong className="text-slate-300">{resettingStudent.name || resettingStudent.phone}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="mt-6 space-y-4">
              {resetError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div>
                <label htmlFor="new-pass" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    id="new-pass"
                    required
                    placeholder="Enter at least 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setResettingStudent(null)
                    setResetError(null)
                    setResetSuccess(null)
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-xl text-white active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {resetLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm Reset'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              Add New Student
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Create a new student login account in the system.
            </p>

            <form onSubmit={handleAddStudent} className="mt-6 space-y-4">
              {addStudentError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>{addStudentError}</span>
                </div>
              )}

              {addStudentSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                  <span>{addStudentSuccess}</span>
                </div>
              )}

              <div>
                <label htmlFor="student-name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  id="student-name"
                  required
                  placeholder="e.g. Muhammed Bilal"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label htmlFor="student-phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Phone Number
                  <span className="ml-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-1.5 py-0.5 rounded-full normal-case tracking-normal">
                    Optional
                  </span>
                </label>
                <input
                  type="tel"
                  id="student-phone"
                  placeholder="e.g. 9876543210 — leave blank to auto-generate"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                  Enter exactly <strong className="text-slate-400">10 digits</strong> without country code (+91), or leave blank to auto-assign a unique ID.
                </p>
              </div>

              <div>
                <label htmlFor="student-batch" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Batch
                </label>
                <select
                  id="student-batch"
                  value={newStudentBatch}
                  onChange={(e) => setNewStudentBatch(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer"
                >
                  <option value="HS1">HS1</option>
                  <option value="HS2">HS2</option>
                  <option value="BS1">BS1</option>
                  <option value="BS2">BS2</option>
                  <option value="BS3">BS3</option>
                  <option value="BS4">BS4</option>
                  <option value="BS5">BS5</option>
                </select>
              </div>

              <div>
                <label htmlFor="student-pass" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showAddStudentPassword ? "text" : "password"}
                    id="student-pass"
                    required
                    placeholder="Enter at least 6 characters"
                    value={newStudentPassword}
                    onChange={(e) => setNewStudentPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddStudentPassword(!showAddStudentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showAddStudentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddStudentOpen(false)
                    setAddStudentError(null)
                    setAddStudentSuccess(null)
                    setNewStudentName('')
                    setNewStudentPhone('')
                    setNewStudentPassword('')
                    setNewStudentBatch('HS1')
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addStudentLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-xl text-white active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {addStudentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Student'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-cyan-400" />
              Edit Student Details
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Update name and phone number for <strong className="text-slate-300">{editingStudent.name || editingStudent.phone}</strong>.
            </p>

            <form onSubmit={handleEditStudentSubmit} className="mt-6 space-y-4">
              {editStudentError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>{editStudentError}</span>
                </div>
              )}

              {editStudentSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                  <span>{editStudentSuccess}</span>
                </div>
              )}

              <div>
                <label htmlFor="edit-student-name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  id="edit-student-name"
                  required
                  placeholder="Muhammed Bilal"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-student-phone" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="edit-student-phone"
                  required
                  placeholder="+919876543216"
                  value={editStudentPhone}
                  onChange={(e) => setEditStudentPhone(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>

              <div>
                <label htmlFor="edit-student-batch" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Batch
                </label>
                <select
                  id="edit-student-batch"
                  value={editStudentBatch}
                  onChange={(e) => setEditStudentBatch(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm cursor-pointer"
                >
                  <option value="HS1">HS1</option>
                  <option value="HS2">HS2</option>
                  <option value="BS1">BS1</option>
                  <option value="BS2">BS2</option>
                  <option value="BS3">BS3</option>
                  <option value="BS4">BS4</option>
                  <option value="BS5">BS5</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStudent(null)
                    setEditStudentError(null)
                    setEditStudentSuccess(null)
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editStudentLoading}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-sm font-bold rounded-xl active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {editStudentLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Admin Password Modal */}
      {isChangePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 border border-blue-900">
                <Lock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Change Password</h3>
                <p className="text-xs text-slate-400">Update your admin account password.</p>
              </div>
            </div>

            <form onSubmit={handleChangeAdminPassword} className="mt-6 space-y-4">
              {changePassError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{changePassError}</span>
                </div>
              )}
              {changePassSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-500" />
                  <span>{changePassSuccess}</span>
                </div>
              )}

              <div>
                <label htmlFor="cp-current" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Current Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showChangePassCurrent ? "text" : "password"}
                    id="cp-current"
                    required
                    placeholder="Enter your current password"
                    value={changePassCurrent}
                    onChange={(e) => setChangePassCurrent(e.target.value)}
                    className="block w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePassCurrent(!showChangePassCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showChangePassCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="cp-new" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showChangePassNew ? 'text' : 'password'}
                    id="cp-new"
                    required
                    placeholder="At least 6 characters"
                    value={changePassNew}
                    onChange={(e) => setChangePassNew(e.target.value)}
                    className="block w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePassNew(!showChangePassNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showChangePassNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {changePassNew.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className={`h-1 flex-1 rounded-full transition-all ${
                      changePassNew.length < 6 ? 'bg-red-600' :
                      changePassNew.length < 10 ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <span className={`text-[10px] font-bold ${
                      changePassNew.length < 6 ? 'text-red-400' :
                      changePassNew.length < 10 ? 'text-amber-400' : 'text-blue-400'
                    }`}>
                      {changePassNew.length < 6 ? 'Too short' : changePassNew.length < 10 ? 'Fair' : 'Strong'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="cp-confirm" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <div className="relative mt-1.5">
                  <input
                    type={showChangePassConfirm ? "text" : "password"}
                    id="cp-confirm"
                    required
                    placeholder="Re-enter new password"
                    value={changePassConfirm}
                    onChange={(e) => setChangePassConfirm(e.target.value)}
                    className={`block w-full px-3.5 py-2.5 pr-10 bg-slate-950/80 border rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 text-sm transition ${
                      changePassConfirm.length > 0 && changePassConfirm !== changePassNew
                        ? 'border-red-800 focus:ring-red-500'
                        : changePassConfirm.length > 0 && changePassConfirm === changePassNew
                        ? 'border-blue-800 focus:ring-blue-500'
                        : 'border-slate-800 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePassConfirm(!showChangePassConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showChangePassConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {changePassConfirm.length > 0 && changePassConfirm !== changePassNew && (
                  <p className="mt-1 text-[10px] text-red-400 font-medium">Passwords do not match</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePassOpen(false)
                    setChangePassError(null)
                    setChangePassSuccess(null)
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePassLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-bold rounded-xl text-white active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                >
                  {changePassLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><Lock className="h-4 w-4" /> Update Password</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {isEditAdminOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-400" />
              Edit Admin Profile
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Update administrative name and admin username.
            </p>

            <form onSubmit={handleEditAdminSubmit} className="mt-6 space-y-4">
              {editAdminError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
                  <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />
                  <span>{editAdminError}</span>
                </div>
              )}

              {editAdminSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-blue-950/30 border border-blue-900/50 p-3 text-xs text-blue-400">
                  <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-blue-500" />
                  <span>{editAdminSuccess}</span>
                </div>
              )}

              <div>
                <label htmlFor="edit-admin-name" className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Admin Name
                </label>
                <input
                  type="text"
                  id="edit-admin-name"
                  required
                  placeholder="System Admin"
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="mt-1.5 block w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Admin Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. admin"
                  value={editAdminPhone}
                  onChange={(e) => setEditAdminPhone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditAdminOpen(false)
                    setEditAdminError(null)
                    setEditAdminSuccess(null)
                  }}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editAdminLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-sm font-semibold rounded-xl text-white active:scale-[0.98] transition cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {editAdminLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unified Custom Delete Warning Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/30 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-950/50 border border-red-900/30 text-red-500 shadow-lg shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-lg font-black text-white">{deletingItem.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {deletingItem.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-xl text-slate-300 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-sm font-bold rounded-xl text-white shadow-lg shadow-red-900/20 active:scale-[0.98] transition cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
    </div>
      )}

      {/* Install App Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-12 w-12 bg-cyan-950/50 rounded-full flex items-center justify-center border border-cyan-900/50">
                <Smartphone className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Install App</h3>
                <p className="text-sm text-slate-300">To install this app on your device:</p>
                <ol className="text-sm text-slate-400 mt-4 text-left space-y-3 list-decimal list-inside">
                  <li>In your browser menu, tap <strong>Share</strong> or <strong>Menu</strong> (three dots).</li>
                  <li>Select <strong>Add to Home screen</strong> or <strong>Install App</strong>.</li>
                </ol>
              </div>
              <button
                onClick={() => setIsInstallModalOpen(false)}
                className="mt-6 w-full py-2.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Check className="h-4 w-4 text-cyan-400" />
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
