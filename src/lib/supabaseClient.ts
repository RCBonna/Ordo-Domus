import { createClient } from '@supabase/supabase-js'

// Estas variáveis o código busca lá naquelas chaves que colocamos na Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Desabilita navigator.locks que causa timeout em StrictMode / múltiplas abas
    lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => fn(),
  }
})
