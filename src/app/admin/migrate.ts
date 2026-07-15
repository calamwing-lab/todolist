'use server'

import { createClient } from '@supabase/supabase-js'

export async function migrateLocalData(payload: any) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Missing Supabase credentials.' }
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  try {
    const { users, tasks, mainTasks, videos } = payload

    // 1. Migrate Main Tasks
    if (mainTasks && Array.isArray(mainTasks)) {
      for (const t of mainTasks) {
        await supabaseAdmin.from('main_tasks').upsert({ id: t.id, label: t.label })
      }
    }

    // 2. Migrate Videos
    if (videos && Array.isArray(videos)) {
      for (const v of videos) {
        await supabaseAdmin.from('videos').upsert({
          id: v.id,
          url: v.url,
          description: v.description,
          created_at: v.created_at || new Date().toISOString()
        })
      }
    }

    // 3. Migrate Users
    // Mapping from old ID to new UUID
    const idMap: Record<string, string> = {}

    if (users && Array.isArray(users)) {
      for (const u of users) {
        if (u.role === 'admin') continue // Skip admin, already exists

        // Format phone
        let phone = u.phone ? u.phone.trim() : ''
        if (phone && !phone.startsWith('+')) {
          if (phone.length === 10) phone = '+91' + phone
          else phone = '+' + phone
        }

        // Email for auth
        const email = `${phone.replace('+', '').trim()}@tracker.com`
        const password = u.password && u.password.length >= 6 ? u.password : '123456'

        // Check if exists
        const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers()
        let authUser = existingAuth.users.find(x => x.email === email)

        if (!authUser) {
          const { data: newAuth, error: authErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          })
          if (authErr) {
            console.error('Failed to create user', u.name, authErr)
            continue
          }
          authUser = newAuth.user
        }

        idMap[u.id] = authUser!.id

        // Upsert to users table
        await supabaseAdmin.from('users').upsert({
          id: authUser!.id,
          phone: phone,
          name: u.name,
          role: 'student',
          batch: u.batch || 'HS1',
          created_at: u.created_at || new Date().toISOString()
        })
      }
    }

    // 4. Migrate Tasks
    if (tasks && typeof tasks === 'object') {
      for (const key of Object.keys(tasks)) {
        // key is like oldId_YYYY-MM-DD
        const parts = key.split('_')
        if (parts.length >= 2) {
          const date = parts.pop()!
          const oldId = parts.join('_')
          const newId = idMap[oldId]

          if (newId) {
            await supabaseAdmin.from('daily_tasks').upsert({
              user_id: newId,
              date: date,
              task_data: tasks[key]
            }, { onConflict: 'user_id, date' })
          }
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    console.error('Migration error:', err)
    return { success: false, error: err.message || 'Unknown error during migration.' }
  }
}
