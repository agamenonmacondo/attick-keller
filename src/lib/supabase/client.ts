import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const auth = {
  // Phone OTP (WhatsApp/SMS)
  async sendOTP(phone: string, channel: 'whatsapp' | 'sms' = 'whatsapp') {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        channel: 'sms',
        data: { channel }
      }
    })
    return { data, error }
  },

  async verifyOTP(phone: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms'
    })
    return { data, error }
  },

  // Email/Password (for admin)
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  async signUpWithEmail(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    })
    return { data, error }
  },

  // Google OAuth
  async signInWithGoogle() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://web-rosy-nine-64.vercel.app'
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin
      }
    })
    return { data, error }
  },

  // Facebook OAuth
  async signInWithFacebook() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://web-rosy-nine-64.vercel.app'
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: origin
      }
    })
    return { data, error }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Get current user
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Reservation helpers
export const reservations = {
  async create(reservation: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select()
      .single()
    return { data, error }
  },

  async getByCustomer(customerId: string) {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('customer_id', customerId)
      .order('reservation_date', { ascending: false })
    return { data, error }
  }
}