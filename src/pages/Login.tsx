import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      // Ensure settings exist on login
      if (data.user) {
        await ensureUserSettings(data.user.id)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Helper function to ensure user has settings record
  const ensureUserSettings = async (userId: string) => {
    try {
      // Check if settings exist
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', userId)
        .single()

      // If no settings exist, create them
      if (!existingSettings) {
        const { error } = await supabase
          .from('settings')
          .insert({ user_id: userId })

        if (error) {
          console.error('Error creating settings:', error)
          // Don't throw - settings can be created later
        }
      }
    } catch (error) {
      console.error('Error checking settings:', error)
      // Don't throw - settings can be created later
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            EMR Business Manager
          </h1>
          <p className="text-gray-400">Manage your joinery business</p>
        </div>

        <div className="bg-white rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-100 text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
