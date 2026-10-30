import { useState } from 'react'
import { supabase } from './supabase'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase!.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    if (error) setError(error.message)
    else setSent(true)
  }

  if (sent) {
    return (
      <p className="text-center text-slate-300 bg-zinc-900/80 border border-zinc-700 rounded-2xl p-6">
        📬 Check the email inbox for a magic link, then open it to get into your binder!
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-6 text-center space-y-3">
      <p className="text-slate-300">Ask a grown-up to enter their email. We'll send a magic link, so there's no password to remember.</p>
      <input
        type="email"
        required
        aria-label="Grown-up's email"
        placeholder="grown-up@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-xl border-2 border-zinc-600 px-3 py-2 bg-zinc-800 text-slate-100 placeholder:text-slate-500 w-full max-w-sm"
      />
      <div>
        <button className="rounded-xl bg-slate-300 hover:bg-white text-zinc-950 font-bold px-5 py-2">
          Send magic link
        </button>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  )
}
