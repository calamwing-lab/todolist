import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('user_session')
  const url = request.nextUrl.clone()

  let user = null
  if (sessionCookie?.value) {
    try {
      // Decode the URL-encoded cookie if needed, or parse directly
      user = JSON.parse(decodeURIComponent(sessionCookie.value))
    } catch (e) {
      // Invalid session cookie format
    }
  }

  const isAuthRoute = url.pathname.startsWith('/admin') || url.pathname.startsWith('/student')

  if (isAuthRoute) {
    if (!user) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    const role = user.role
    if (url.pathname.startsWith('/admin') && role !== 'admin') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (url.pathname.startsWith('/student') && role !== 'student') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  if (url.pathname === '/login' || url.pathname === '/') {
    if (user) {
      if (user.role === 'admin') {
        url.pathname = '/admin'
        return NextResponse.redirect(url)
      } else if (user.role === 'student') {
        url.pathname = '/student'
        return NextResponse.redirect(url)
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
