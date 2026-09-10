// Safe storage utility that gracefully handles restricted environments
// (e.g. mobile WebViews, sandboxed iframes, strict tracking prevention)
// where accessing window.localStorage or document.cookie throws a SecurityError.

const memoryStorage = new Map<string, string>()

/**
 * Safely retrieve an item from localStorage with in-memory fallback.
 * Will never throw SecurityError or DOMException.
 */
export function safeGetItem(key: string): string | null {
  if (typeof window !== 'undefined') {
    try {
      const value = window.localStorage.getItem(key)
      if (value !== null) {
        return value
      }
    } catch {
      // localStorage is blocked (SecurityError), quota exceeded, or disabled
    }
  }
  return memoryStorage.get(key) ?? null
}

/**
 * Safely store an item in localStorage and in-memory fallback.
 * Will never throw SecurityError or DOMException.
 */
export function safeSetItem(key: string, value: string): void {
  // Always update in-memory storage so session state persists within the JS lifecycle
  memoryStorage.set(key, value)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Silently fall back to memoryStorage
    }
  }
}

/**
 * Safely remove an item from localStorage and in-memory fallback.
 * Will never throw SecurityError or DOMException.
 */
export function safeRemoveItem(key: string): void {
  memoryStorage.delete(key)

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // Silently ignore
    }
  }
}

/**
 * Safely read a cookie value by name.
 * Will never throw SecurityError if document.cookie is blocked.
 */
export function safeGetCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  try {
    const cookies = document.cookie ? document.cookie.split('; ') : []
    for (const c of cookies) {
      const [cookieName, ...cookieVal] = c.split('=')
      if (cookieName && cookieName.trim() === name) {
        return decodeURIComponent(cookieVal.join('='))
      }
    }
  } catch {
    // document.cookie access denied
  }
  return null
}

/**
 * Safely set a cookie with SameSite=Lax and optional maxAge.
 * Will never throw SecurityError if document.cookie is blocked.
 */
export function safeSetCookie(name: string, value: string, maxAgeSeconds: number = 604800): void {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`
  } catch {
    // document.cookie write denied
  }
}

/**
 * Safely delete a cookie by setting its expiration to the past.
 * Will never throw SecurityError if document.cookie is blocked.
 */
export function safeRemoveCookie(name: string): void {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax`
  } catch {
    // document.cookie delete denied
  }
}
