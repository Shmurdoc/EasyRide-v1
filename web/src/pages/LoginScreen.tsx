import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const { login, loading } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (error) {
      toast.error(error);
      setError('');
    }
  }, [error, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || 'Invalid credentials');
    } else {
      toast.success('Welcome back');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 bg-mesh-dark opacity-90" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ink-950/40 to-ink-950" aria-hidden />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary-500/10 blur-3xl animate-float" aria-hidden />
      <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-accent-500/10 blur-3xl animate-float" style={{ animationDelay: '2s' }} aria-hidden />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">

          <div className="hidden lg:block animate-slide-up">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-ink-300 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-400 animate-pulse" />
              Phalaborwa, ZA · Live
            </div>
            <h1 className="text-5xl xl:text-6xl font-display font-bold leading-[1.05] tracking-tight text-balance">
              Move people.<br />
              <span className="bg-gradient-to-r from-primary-300 via-accent-300 to-warn-300 bg-clip-text text-transparent">
                Power a town.
              </span>
            </h1>
            <p className="mt-6 text-lg text-ink-300 max-w-md text-pretty leading-relaxed">
              The rideshare and delivery platform built for Phalaborwa. Real-time dispatch, instant payouts, and full operational control from one dashboard.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4">
              {[
                { k: 'Active drivers', v: '24/7' },
                { k: 'Avg pickup', v: '3.2min' },
                { k: 'Today', v: 'R12.4k' },
              ].map((s) => (
                <div key={s.k} className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  <div className="text-2xl font-display font-bold text-white">{s.v}</div>
                  <div className="text-xs text-ink-400 mt-1">{s.k}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-scale-in">
            <div className="card-glass p-8 sm:p-10 bg-white/[0.03] border-white/10">
              <div className="flex items-center gap-3 mb-8">
                <Logo />
                <div>
                  <div className="font-display font-bold text-xl">EasyRyde</div>
                  <div className="text-xs text-ink-400">Admin Console</div>
                </div>
              </div>

              <h2 className="text-2xl font-display font-bold text-white">Sign in</h2>
              <p className="text-sm text-ink-400 mt-1.5 mb-7">Use your operator credentials to continue.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label text-ink-300">Email</label>
                  <input
                    type="email"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-3 text-sm text-white placeholder-ink-500
                               focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 focus:outline-none transition-all"
                    placeholder="you@easyryde.co.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="label text-ink-300">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-3 pr-12 text-sm text-white placeholder-ink-500
                                 focus:border-primary-400 focus:ring-2 focus:ring-primary-500/30 focus:outline-none transition-all"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition-colors text-xs"
                    >
                      {showPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 font-semibold rounded-lg
                             bg-gradient-to-r from-primary-500 to-primary-700 text-white
                             hover:from-primary-400 hover:to-primary-600
                             px-4 py-3 text-sm transition-all duration-200 ease-spring
                             shadow-glow-primary hover:shadow-pop hover:-translate-y-px
                             disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Signing in…
                    </>
                  ) : (
                    <>Sign in <span aria-hidden>→</span></>
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-ink-500 mt-6">
              By signing in you agree to our terms and privacy policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-glow-primary">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h14l-1.5-5h-11L5 17Z" />
        <circle cx="7.5" cy="17" r="1.5" fill="white" />
        <circle cx="16.5" cy="17" r="1.5" fill="white" />
        <path d="M6 12l2-6h8l2 6" />
      </svg>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4Z" />
    </svg>
  );
}
