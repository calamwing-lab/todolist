'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, getCurrentUser, addStudentLocal } from '@/utils/db'
import { Phone, Lock, Eye, EyeOff, Loader2, ShieldAlert, User, BookOpen } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()

  const [isAdminLogin, setIsAdminLogin] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  
  // Login form states
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  
  // Registration form states
  const [regName, setRegName] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regBatch, setRegBatch] = useState('HS1')
  const [regPassword, setRegPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [regPhoneError, setRegPhoneError] = useState<string | null>(null)

  // Redirect if session is already present — show spinner while checking
  useEffect(() => {
    const user = getCurrentUser()
    if (user) {
      if (user.role === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/student')
      }
      // Don't setSessionChecked — let the redirect happen
    } else {
      setSessionChecked(true)
    }
  }, [])

  // While checking session / redirecting, show a clean loading screen
  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />
          <span className="text-sm text-slate-400 font-medium">Loading...</span>
        </div>
      </div>
    )
  }


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Form validation
    if (!phone) {
      setError(isAdminLogin ? 'Username is required.' : 'Phone number is required.')
      setLoading(false)
      return
    }
    if (!password) {
      setError('Password is required.')
      setLoading(false)
      return
    }

    try {
      let res;
      if (isAdminLogin) {
        console.log('Attempting admin login with:', { phone, password });
        res = await login(phone, password)
      } else {
        // Format phone number: strip spaces/dashes and ensure leading country code
        let formattedPhone = phone.trim().replace(/[\s-()]/g, '')
        if (!formattedPhone.startsWith('+')) {
          if (formattedPhone.length === 12 && formattedPhone.startsWith('91')) {
            formattedPhone = '+' + formattedPhone
          } else if (formattedPhone.length === 10) {
            formattedPhone = '+91' + formattedPhone
          } else {
            formattedPhone = '+' + formattedPhone
          }
        }
        res = await login(formattedPhone, password)
      }

      if (res.success && res.user) {
        router.refresh()
        if (res.user.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/student')
        }
      } else {
        setError(res.error || 'Invalid credentials or login failed.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'An unexpected error occurred during login.')
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setRegPhoneError(null)

    if (!regName.trim()) {
      setError('Name is required.')
      setLoading(false)
      return
    }

    // Strict 10-digit phone validation for public registration
    const rawPhone = regPhone.trim().replace(/[\s\-()]/g, '')
    if (!rawPhone) {
      setRegPhoneError('Phone number is required.')
      setLoading(false)
      return
    }
    // Reject if it starts with + or has a country code prefix
    if (rawPhone.startsWith('+') || (rawPhone.startsWith('91') && rawPhone.length > 10)) {
      setRegPhoneError('Please enter a valid 10-digit mobile number without country code.')
      setLoading(false)
      return
    }
    // Must be exactly 10 digits
    if (!/^[6-9]\d{9}$/.test(rawPhone)) {
      setRegPhoneError('Please enter a valid 10-digit mobile number without country code.')
      setLoading(false)
      return
    }

    if (!regPassword) {
      setError('Password is required.')
      setLoading(false)
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      setLoading(false)
      return
    }

    // Format to E.164 for Supabase
    const formattedPhone = '+91' + rawPhone

    try {
      const res = await addStudentLocal(regName.trim(), formattedPhone, regPassword, regBatch)
      if (res.success && res.student) {
        // Auto login
        const loginRes = await login(formattedPhone, regPassword)
        if (loginRes.success && loginRes.user) {
          router.refresh()
          router.push('/student')
        } else {
          // Fallback to login screen
          setIsRegistering(false)
          setPhone(rawPhone)
          setPassword(regPassword)
          setError(loginRes.error || 'Registration successful! Please sign in.')
          setLoading(false)
        }
      } else {
        setError(res.error || 'Registration failed.')
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Registration error:', err)
      setError(err.message || 'An unexpected error occurred during registration.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-900/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-cyan-950/20 via-slate-950/50 to-slate-950" />
      
      {/* Glow effect cards */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="text-center">
          <div 
            onClick={() => {
              if (!isRegistering) {
                setIsAdminLogin(!isAdminLogin)
                setError(null)
                setPhone('')
                setPassword('')
              }
            }}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20 ring-1 ring-white/20 transition-all ${isRegistering ? '' : 'cursor-pointer hover:opacity-90 active:scale-95'}`}
          >
            <span className="text-xl font-black text-white">S</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-white">
            {isRegistering ? 'Student Registration' : (isAdminLogin ? 'Admin Portal' : 'Daily Tracking System')}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {isRegistering ? 'Create your profile to start tracking daily tasks' : (isAdminLogin ? 'Administrative Access Credentials' : 'Phase 1 • Secure Portal Authentication')}
          </p>
        </div>

        <div className="mt-8 w-full sm:mx-auto sm:w-full sm:max-w-md">
          <div className="backdrop-blur-md bg-slate-900/60 border border-slate-800 py-8 px-4 shadow-2xl shadow-slate-950/80 rounded-2xl sm:px-10 ring-1 ring-white/5">
            {isRegistering ? (
              <form className="space-y-5" onSubmit={handleRegister}>
                {error && (
                  <div className="flex items-center gap-3 rounded-lg bg-red-950/50 border border-red-900/50 p-3.5 text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="regName" className="block text-sm font-semibold text-slate-300">
                    Full Name
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="regName"
                      name="regName"
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="regPhone" className="block text-sm font-semibold text-slate-300">
                    Phone Number
                    <span className="ml-1.5 text-[10px] font-bold text-red-400">*</span>
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Phone className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="regPhone"
                      name="regPhone"
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={regPhone}
                      onChange={(e) => {
                        setRegPhone(e.target.value)
                        setRegPhoneError(null) // clear inline error on change
                      }}
                      className={`block w-full pl-10 pr-4 py-3 bg-slate-950/80 border rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 transition duration-150 ease-in-out text-sm ${
                        regPhoneError
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-800 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {regPhoneError ? (
                    <p className="mt-1.5 text-xs text-red-400 font-medium flex items-start gap-1">
                      <span className="mt-0.5 shrink-0">⚠</span>
                      {regPhoneError}
                    </p>
                  ) : (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Enter your 10-digit mobile number without country code.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="regBatch" className="block text-sm font-semibold text-slate-300">
                    Batch
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <BookOpen className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <select
                      id="regBatch"
                      name="regBatch"
                      value={regBatch}
                      onChange={(e) => setRegBatch(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm appearance-none cursor-pointer"
                    >
                      <option value="HS1" className="bg-slate-950 text-white">HS1</option>
                      <option value="HS2" className="bg-slate-950 text-white">HS2</option>
                      <option value="BS1" className="bg-slate-950 text-white">BS1</option>
                      <option value="BS2" className="bg-slate-950 text-white">BS2</option>
                      <option value="BS3" className="bg-slate-950 text-white">BS3</option>
                      <option value="BS4" className="bg-slate-950 text-white">BS4</option>
                      <option value="BS5" className="bg-slate-950 text-white">BS5</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="regPassword" className="block text-sm font-semibold text-slate-300">
                    Password
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="regPassword"
                      name="regPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-blue-500 active:scale-[0.98] transition duration-150 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Register'
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(false)
                      setError(null)
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-blue-400 hover:underline transition cursor-pointer"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-6" onSubmit={handleLogin}>
                {error && (
                  <div className="flex items-center gap-3 rounded-lg bg-red-950/50 border border-red-900/50 p-3.5 text-sm text-red-400 animate-in fade-in slide-in-from-top-1 duration-200">
                    <ShieldAlert className="h-5 w-5 shrink-0 text-red-500" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-300">
                    {isAdminLogin ? 'Username' : 'Phone Number'}
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      {isAdminLogin ? (
                        <User className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      ) : (
                        <Phone className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      )}
                    </div>
                    <input
                      id="phone"
                      name="phone"
                      type={isAdminLogin ? 'text' : 'tel'}
                      required
                      placeholder={isAdminLogin ? 'Enter admin username' : 'e.g. 9876543210'}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-300">
                    Password
                  </label>
                  <div className="mt-1.5 relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-blue-500 active:scale-[0.98] transition duration-150 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-blue-500/10 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  {!isAdminLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true)
                        setError(null)
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-blue-400 hover:underline transition cursor-pointer"
                    >
                      Don't have an account? Register Now
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
