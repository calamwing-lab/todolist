'use server'

import { createClient } from '@supabase/supabase-js'

export async function resetStudentPassword(studentId: string, newPassword: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return { 
      success: false, 
      error: 'Supabase Service Role Key is not configured on the server. Please add it to your .env.local file.' 
    }
  }

  // Create admin client
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Call administrative update user API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      studentId,
      { password: newPassword }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update password.' }
  }
}

export async function createStudentAuth(name: string, phone: string, password: string, batch?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return { 
      success: false, 
      error: 'Supabase Service Role Key is not configured on the server. Please add it to your .env.local file.' 
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Format phone to match email format
  const cleanPhone = phone.replace('+', '').trim()
  const email = `${cleanPhone}@tracker.com`

  try {
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        role: 'student',
        name,
        phone,
        batch
      }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Wait, the public.users record is created by trigger, let's verify or update if needed
    return { success: true, user: user.user }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create student.' }
  }
}

export async function deleteStudentAuth(studentId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return { 
      success: false, 
      error: 'Supabase Service Role Key is not configured on the server.' 
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(studentId)
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete student.' }
  }
}

export async function changeAdminPassword(adminId: string, newPassword: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return {
      success: false,
      error: 'Supabase Service Role Key is not configured on the server.'
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    let targetUuid = adminId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(targetUuid)) {
      // Find real admin UUID if cached ID is not a UUID
      const { data: usersData, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
      if (!authErr && usersData.users) {
        const adminAuthUser = usersData.users.find(u => u.user_metadata?.role === 'admin' || u.email === '919876543210@tracker.com');
        if (adminAuthUser) {
          targetUuid = adminAuthUser.id;
        }
      }
    }

    if (!uuidRegex.test(targetUuid)) {
      return { success: false, error: 'Invalid user ID format. Please log out and log in again.' };
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUuid, {
      password: newPassword
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to change password.' }
  }
}

export async function getStudentsAdminData(dateStrings?: string[]) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return { 
      success: false, 
      error: 'Supabase Service Role Key is not configured on the server. Please add it to your .env.local file.' 
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { data: profiles, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: true })

    if (profileErr) throw profileErr

    const { data: authUsersRes, error: authErr } = await supabaseAdmin.auth.admin.listUsers()
    if (authErr) throw authErr

    const authMap = new Map<string, any>()
    if (authUsersRes && authUsersRes.users) {
      authUsersRes.users.forEach((u: any) => {
        authMap.set(u.id, u)
      })
    }

    let dailyTasks: any[] = []
    if (dateStrings && dateStrings.length > 0) {
      const { data, error: taskErr } = await supabaseAdmin
        .from('daily_tasks')
        .select('id, user_id, date, task_data, created_at')
        .in('date', dateStrings)
      if (taskErr) throw taskErr
      dailyTasks = data || []
    } else {
      const { data, error: taskErr } = await supabaseAdmin
        .from('daily_tasks')
        .select('id, user_id, date, task_data, created_at')
      if (taskErr) throw taskErr
      dailyTasks = data || []
    }

    const studentTasksMap = new Map<string, any[]>()
    dailyTasks.forEach((t: any) => {
      const list = studentTasksMap.get(t.user_id) || []
      list.push(t)
      studentTasksMap.set(t.user_id, list)
    })

    const students = profiles.map((p: any) => {
      const authUser = authMap.get(p.id)
      const lastSignIn = authUser?.last_sign_in_at || null

      const userTasks = studentTasksMap.get(p.id) || []
      const taskCount = userTasks.length
      
      let lastTaskDate: string | null = null
      if (userTasks.length > 0) {
        const timestamps = userTasks.map((t: any) => new Date(t.date).getTime()).filter((time: number) => !isNaN(time))
        if (timestamps.length > 0) {
          lastTaskDate = new Date(Math.max(...timestamps)).toLocaleDateString('en-CA')
        }
      }

      // Calculate today's status if dateStrings is provided
      let inactiveToday = true
      if (dateStrings && dateStrings.length > 0) {
        const todayStr = dateStrings[dateStrings.length - 1]
        const todayTask = userTasks.find((t: any) => t.date === todayStr)
        if (todayTask && todayTask.task_data) {
          const hasSubmitted = Object.values(todayTask.task_data).some(v => v === true)
          inactiveToday = !hasSubmitted
        }
      }

      return {
        id: p.id,
        phone: p.phone,
        name: p.name || 'Student',
        role: 'student',
        created_at: p.created_at,
        batch: p.batch || undefined,
        skills: p.skills || [],
        personalTasks: p.personal_tasks || [],
        last_sign_in_at: lastSignIn,
        last_task_date: lastTaskDate,
        task_count: taskCount,
        inactiveToday,
        dailyTasks: userTasks
      }
    })

    return { success: true, students }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch admin student data.' }
  }
}

export async function getStudentAdminData(studentId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_supabase_service_role_key_here') {
    return { 
      success: false, 
      error: 'Supabase Service Role Key is not configured on the server. Please add it to your .env.local file.' 
    }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', studentId)
      .single()

    if (profileErr) throw profileErr

    const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.getUserById(studentId)
    const lastSignIn = authErr ? null : (authUser?.user?.last_sign_in_at || null)

    const { data: dailyTasks, error: taskErr } = await supabaseAdmin
      .from('daily_tasks')
      .select('date')
      .eq('user_id', studentId)

    if (taskErr) throw taskErr

    const taskCount = dailyTasks ? dailyTasks.length : 0
    let lastTaskDate: string | null = null
    if (dailyTasks && dailyTasks.length > 0) {
      const timestamps = dailyTasks.map((t: any) => new Date(t.date).getTime()).filter((time: number) => !isNaN(time))
      if (timestamps.length > 0) {
        lastTaskDate = new Date(Math.max(...timestamps)).toLocaleDateString('en-CA')
      }
    }

    const student = {
      id: profile.id,
      phone: profile.phone,
      name: profile.name || 'Student',
      role: 'student',
      created_at: profile.created_at,
      batch: profile.batch || undefined,
      skills: profile.skills || [],
      personalTasks: profile.personal_tasks || [],
      last_sign_in_at: lastSignIn,
      last_task_date: lastTaskDate,
      task_count: taskCount
    }

    return { success: true, student }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch student details.' }
  }
}
