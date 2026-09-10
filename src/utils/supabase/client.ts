import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return []
          try {
            if (!document.cookie) return []
            return document.cookie.split('; ').map(c => {
              const [name, ...val] = c.split('=')
              return { name: name.trim(), value: val.join('=') }
            }).filter(c => Boolean(c.name))
          } catch {
            return []
          }
        },
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              let cookieStr = `${name}=${value}; path=${options?.path ?? '/'}`
              if (options?.maxAge !== undefined) cookieStr += `; max-age=${options.maxAge}`
              if (options?.domain) cookieStr += `; domain=${options.domain}`
              if (options?.sameSite) cookieStr += `; SameSite=${options.sameSite}`
              if (options?.secure) cookieStr += '; Secure'
              document.cookie = cookieStr
            })
          } catch {
            // Silently ignore if cookies are restricted in WebView
          }
        }
      }
    }
  )
}

