import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // Protect /admin and /student routes
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/student')) {
    if (!user) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Get the user's role from the public.users table
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role

    if (url.pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/student') && role !== 'student') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Redirect authenticated user if accessing login or root page
  if (url.pathname === '/login' || url.pathname === '/') {
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()
      const role = profile?.role || user.user_metadata?.role
      
      if (role === 'admin') {
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      } else if (role === 'student') {
        url.pathname = '/student'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
