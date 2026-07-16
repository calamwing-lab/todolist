'use client'

import { createClient } from './supabase/client'
import { createStudentAuth, deleteStudentAuth, resetStudentPassword as resetAuthPassword } from '@/app/admin/actions'

export interface PersonalTask {
  id: string
  label: string
  completed: boolean
}

export interface MainTask {
  id: string
  label: string
}

export interface User {
  id: string
  phone: string
  name: string
  role: 'admin' | 'student'
  created_at: string
  skills?: string[]
  personalTasks?: PersonalTask[]
  batch?: string
  last_notification_read_at?: string | null
}

export interface VideoRecord {
  id: string
  url: string
  description: string | null
  created_at: string
}

export interface DailyTask {
  id: string
  user_id: string
  date: string
  task_data: Record<string, boolean>
  created_at: string
}

const STORAGE_KEYS = {
  SESSION: 'dt_session',
}

const isBrowser = () => typeof window !== 'undefined'

export async function login(phone: string, pass: string): Promise<{ success: boolean; user?: User; error?: string }> {
  let normalizedPhone = phone.trim()
  if (normalizedPhone.toLowerCase() === 'admin1') {
    normalizedPhone = '919876543210'
  } else if (!normalizedPhone.startsWith('+')) {
    if (normalizedPhone.length === 10) {
      normalizedPhone = '91' + normalizedPhone
    }
  }
  
  const cleanPhone = normalizedPhone.replace('+', '').trim()
  const email = `${cleanPhone}@tracker.com`

  const supabase = createClient()
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data.user || !data.session) {
      return { success: false, error: 'Login failed. No session returned.' }
    }

    const { data: profile, error: profileErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single()

    let user: User
    if (profileErr || !profile) {
      user = {
        id: data.user.id,
        phone: phone,
        name: data.user.user_metadata?.name || 'User',
        role: (data.user.user_metadata?.role as 'admin' | 'student') || 'student',
        created_at: data.user.created_at,
        batch: data.user.user_metadata?.batch,
        skills: [],
        personalTasks: [],
        last_notification_read_at: null
      }
    } else {
      user = {
        id: profile.id,
        phone: profile.phone || phone,
        name: profile.name || 'User',
        role: profile.role as 'admin' | 'student',
        created_at: profile.created_at,
        batch: profile.batch || undefined,
        skills: profile.skills || [],
        personalTasks: profile.personal_tasks || [],
        last_notification_read_at: profile.last_notification_read_at || null
      }
    }

    if (isBrowser()) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user))
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=604800; SameSite=Lax`
    }

    return { success: true, user }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during login.' }
  }
}

export function logout() {
  if (!isBrowser()) return
  localStorage.removeItem(STORAGE_KEYS.SESSION)
  document.cookie = 'user_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax'
  const supabase = createClient()
  supabase.auth.signOut().catch(() => {})
}

export function getCurrentUser(): User | null {
  if (!isBrowser()) return null
  const session = localStorage.getItem(STORAGE_KEYS.SESSION)
  return session ? JSON.parse(session) : null
}

export async function getStudents(): Promise<User[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: true })

    if (error) throw error

    return data.map(u => ({
      id: u.id,
      phone: u.phone,
      name: u.name || 'Student',
      role: 'student',
      created_at: u.created_at,
      batch: u.batch || undefined,
      skills: u.skills || [],
      personalTasks: u.personal_tasks || []
    }))
  } catch (e: any) {
    console.error('getStudents error:', e)
    return []
  }
}

export async function getStudentById(id: string): Promise<User | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return {
      id: data.id,
      phone: data.phone,
      name: data.name || 'Student',
      role: data.role as 'student' | 'admin',
      created_at: data.created_at,
      batch: data.batch || undefined,
      skills: data.skills || [],
      personalTasks: data.personal_tasks || [],
      last_notification_read_at: data.last_notification_read_at || null
    }
  } catch (e: any) {
    console.error('getStudentById error:', e)
    return null
  }
}

export async function resetStudentPassword(studentId: string, newPass: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authRes = await resetAuthPassword(studentId, newPass)
    if (!authRes.success) {
      return { success: false, error: authRes.error }
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to reset password.' }
  }
}

// Generates a unique 10-digit numeric phone string not already used in the DB.
async function generateUniquePhone(): Promise<string> {
  const supabase = createClient()
  for (let attempt = 0; attempt < 10; attempt++) {
    // Random 10-digit number (first digit 6-9, like Indian mobile numbers)
    const first = String(Math.floor(Math.random() * 4) + 6) // 6,7,8,9
    const rest = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')
    const candidate = first + rest
    // Check uniqueness in users table
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('phone', '+91' + candidate)
      .maybeSingle()
    if (!data) return candidate // not found → unique
  }
  // Fallback: timestamp-based suffix (guaranteed unique enough)
  return String(6000000000 + (Date.now() % 1000000000)).slice(0, 10)
}

export async function addStudent(name: string, phone: string, pass: string, batch?: string): Promise<{ success: boolean; student?: User; error?: string }> {
  const trimmedPhone = phone.trim()
  let formattedPhone = ''

  // If phone is blank (admin left it empty), auto-generate a unique 10-digit number
  if (!trimmedPhone) {
    const rawGenerated = await generateUniquePhone()
    formattedPhone = '+91' + rawGenerated
  } else {
    // Standardize input by removing non-digits, except possible leading plus sign
    const cleanedPhone = trimmedPhone.replace(/[\s\-()]/g, '')
    if (cleanedPhone.startsWith('+91')) {
      const numericPart = cleanedPhone.slice(3)
      if (!/^\d{10}$/.test(numericPart)) {
        return { success: false, error: 'Phone number must be exactly 10 digits.' }
      }
      formattedPhone = cleanedPhone
    } else if (cleanedPhone.startsWith('91') && cleanedPhone.length === 12) {
      const numericPart = cleanedPhone.slice(2)
      if (!/^\d{10}$/.test(numericPart)) {
        return { success: false, error: 'Phone number must be exactly 10 digits.' }
      }
      formattedPhone = '+' + cleanedPhone
    } else {
      const cleanDigits = cleanedPhone.replace(/\D/g, '')
      if (!/^\d{10}$/.test(cleanDigits)) {
        return { success: false, error: 'Phone number must be exactly 10 digits.' }
      }
      formattedPhone = '+91' + cleanDigits
    }
  }

  try {
    const authRes = await createStudentAuth(name.trim(), formattedPhone, pass, batch)
    if (!authRes.success || !authRes.user) {
      return { success: false, error: authRes.error }
    }

    const supabase = createClient()
    await supabase
      .from('users')
      .update({ name: name.trim(), batch })
      .eq('id', authRes.user.id)

    const newStudent: User = {
      id: authRes.user.id,
      phone: formattedPhone,
      name: name.trim(),
      role: 'student',
      batch,
      created_at: authRes.user.created_at,
      skills: [],
      personalTasks: []
    }

    return { success: true, student: newStudent }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to create student.' }
  }
}

export async function updateUserProfile(userId: string, name: string, phone: string, batch?: string): Promise<{ success: boolean; error?: string }> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return { success: false, error: 'Invalid user ID format. Please log out and log in again.' };
  }

  let formattedPhone = phone.trim()
  if (formattedPhone && !formattedPhone.startsWith('+')) {
    if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
      formattedPhone = '+' + formattedPhone
    } else if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone
    }
  }

  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('users')
      .update({
        name: name.trim(),
        phone: formattedPhone,
        batch: batch || null
      })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
 
    const currentSession = getCurrentUser()
    if (currentSession && currentSession.id === userId) {
      const updatedUser: User = {
        ...currentSession,
        name: name.trim(),
        phone: formattedPhone,
        batch: batch || currentSession.batch
      }
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser))
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=604800; SameSite=Lax`
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update profile.' }
  }
}

export async function markNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const timestamp = new Date().toISOString()
    const { error } = await supabase
      .from('users')
      .update({ last_notification_read_at: timestamp })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }

    const currentSession = getCurrentUser()
    if (currentSession && currentSession.id === userId) {
      const updatedUser: User = {
        ...currentSession,
        last_notification_read_at: timestamp
      }
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser))
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=604800; SameSite=Lax`
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update notification read status.' }
  }
}

export async function deleteStudent(studentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const authRes = await deleteStudentAuth(studentId)
    const supabase = createClient()
    const { error: dbErr } = await supabase.from('users').delete().eq('id', studentId)

    if (dbErr) {
      return { success: false, error: dbErr.message }
    }
    
    // If the auth user was already deleted or doesn't exist, we still want to consider the public.users deletion a success
    if (!authRes.success && authRes.error !== 'User not found' && authRes.error !== 'User not found.') {
      // It's a different error, but if it's already removed from DB, we shouldn't block the UI
    }

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to delete student.' }
  }
}

export async function getVideos(): Promise<VideoRecord[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (e: any) {
    console.error('getVideos error:', e)
    return []
  }
}

export async function getLatestVideo(): Promise<VideoRecord | null> {
  const vids = await getVideos()
  return vids.length > 0 ? vids[0] : null
}

export async function addVideo(url: string, description: string): Promise<VideoRecord> {
  const newVideo: VideoRecord = {
    id: 'vid-' + Math.random().toString(36).substr(2, 9),
    url,
    description: description || null,
    created_at: new Date().toISOString()
  }

  const supabase = createClient()
  try {
    const { error } = await supabase.from('videos').insert(newVideo)
    if (error) throw error
    return newVideo
  } catch (e: any) {
    throw e
  }
}

export async function deleteVideo(id: string): Promise<void> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('videos').delete().eq('id', id)
    if (error) throw error
  } catch (e: any) {
    console.error('deleteVideo error:', e)
  }
}

export async function getDailyTasks(userId: string, date: string): Promise<Record<string, boolean>> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .maybeSingle()

    if (error) throw error
    return data?.task_data || {}
  } catch (e: any) {
    console.error('getDailyTasks error:', e)
    return {}
  }
}

export async function saveDailyTasks(userId: string, date: string, taskData: Record<string, boolean>): Promise<void> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('daily_tasks')
      .upsert({
        user_id: userId,
        date,
        task_data: taskData
      }, {
        onConflict: 'user_id,date'
      })

    if (error) throw error
  } catch (e: any) {
    console.error('saveDailyTasks error:', e)
  }
}

export async function getStudentHistoryLast7Days(userId: string, dates: string[]): Promise<DailyTask[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .in('date', dates)

    if (error) throw error

    const historyMap = new Map<string, DailyTask>()
    data.forEach(item => {
      historyMap.set(item.date, {
        id: item.id,
        user_id: item.user_id,
        date: item.date,
        task_data: item.task_data,
        created_at: item.created_at
      })
    })

    return dates.map(date => {
      return historyMap.get(date) || {
        id: '',
        user_id: userId,
        date,
        task_data: {},
        created_at: ''
      }
    })
  } catch (e: any) {
    console.error('getStudentHistoryLast7Days error:', e)
    return dates.map(date => ({
      id: '',
      user_id: userId,
      date,
      task_data: {},
      created_at: ''
    }))
  }
}

export async function updateStudentSkills(studentId: string, skills: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('users')
      .update({ skills })
      .eq('id', studentId)

    if (error) return { success: false, error: error.message }

    const currentSession = getCurrentUser()
    if (currentSession && currentSession.id === studentId) {
      const updatedUser = { ...currentSession, skills }
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser))
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=604800; SameSite=Lax`
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update skills.' }
  }
}

export interface LeaderboardEntry {
  id: string
  name: string
  avgPercentage: number
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const students = await getStudents()
  const mainTasks = await getMainTasks()
  const totalTasksCount = mainTasks.length || 1
  
  const dateStrings: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dateStrings.push(d.toLocaleDateString('en-CA'))
  }

  const studentIds = students.map(s => s.id)
  const supabase = createClient()
  let tasksMap: Record<string, DailyTask> = {}

  try {
    const { data: dbTasks, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .in('user_id', studentIds)
      .in('date', dateStrings)

    if (!error && dbTasks) {
      dbTasks.forEach(item => {
        const key = `${item.user_id}_${item.date}`
        tasksMap[key] = {
          id: item.id,
          user_id: item.user_id,
          date: item.date,
          task_data: item.task_data,
          created_at: item.created_at
        }
      })
    }
  } catch (e: any) {
    console.error('getLeaderboard tasks error:', e)
  }
  
  const leaderboard: LeaderboardEntry[] = students.map(student => {
    let totalPercentage = 0
    dateStrings.forEach(date => {
      const key = `${student.id}_${date}`
      const log = tasksMap[key]
      if (log && log.task_data) {
        const completed = Object.values(log.task_data).filter(Boolean).length
        const pct = Math.round((completed / totalTasksCount) * 100)
        totalPercentage += pct
      }
    })
    const avg = Math.round(totalPercentage / 7)
    return {
      id: student.id,
      name: student.name || 'Student',
      avgPercentage: avg
    }
  })

  return leaderboard.sort((a, b) => b.avgPercentage - a.avgPercentage)
}

export async function updateStudentPersonalTasks(studentId: string, tasks: PersonalTask[]): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('users')
      .update({ personal_tasks: tasks })
      .eq('id', studentId)

    if (error) return { success: false, error: error.message }

    const currentSession = getCurrentUser()
    if (currentSession && currentSession.id === studentId) {
      const updatedUser = { ...currentSession, personalTasks: tasks }
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(updatedUser))
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(updatedUser))}; path=/; max-age=604800; SameSite=Lax`
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update personal tasks.' }
  }
}

export async function getMainTasks(): Promise<MainTask[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('main_tasks')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error
    return data || []
  } catch (e: any) {
    console.error('getMainTasks error:', e)
    return []
  }
}

export async function addMainTask(label: string): Promise<{ success: boolean; task?: MainTask; error?: string }> {
  const trimmed = label.trim()
  if (!trimmed) {
    return { success: false, error: 'Task label cannot be empty.' }
  }
  const tasks = await getMainTasks()
  if (tasks.some(t => t.label.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'Task already exists.' }
  }

  const newTask: MainTask = {
    id: 'task_' + Math.random().toString(36).substr(2, 9),
    label: trimmed
  }

  const supabase = createClient()
  try {
    const { error } = await supabase.from('main_tasks').insert(newTask)
    if (error) return { success: false, error: error.message }
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  return { success: true, task: newTask }
}

export async function updateMainTask(id: string, newLabel: string): Promise<{ success: boolean; error?: string }> {
  const trimmed = newLabel.trim()
  if (!trimmed) {
    return { success: false, error: 'Task label cannot be empty.' }
  }
  
  const tasks = await getMainTasks()
  const index = tasks.findIndex(t => t.id === id)
  if (index === -1) {
    return { success: false, error: 'Task not found.' }
  }

  if (tasks.some((t, i) => i !== index && t.label.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'Another task with this label already exists.' }
  }

  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('main_tasks')
      .update({ label: trimmed })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  return { success: true }
}

export async function deleteMainTask(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('main_tasks').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
  } catch (e: any) {
    return { success: false, error: e.message }
  }

  return { success: true }
}

// Aliases to satisfy existing components that might be calling *Local functions
export { addStudent as addStudentLocal }
export { resetStudentPassword as resetStudentPasswordLocal }
export { updateUserProfile as updateUserProfileLocal }
export { deleteStudent as deleteStudentLocal }
export { addMainTask as addMainTaskLocal }
export { updateMainTask as updateMainTaskLocal }
export { deleteMainTask as deleteMainTaskLocal }
