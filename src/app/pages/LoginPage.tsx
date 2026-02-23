import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

import { ImageWithFallback } from '../components/image/ImageWithFallback';
import dashboardImage from '../components/image/logo.jpeg';

// Fallback SVG mark for mobile header only
function WeegMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lWBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="lWOrange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <text x="2" y="31" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="30" fill="url(#lWBlue)">W</text>
      <path d="M 4 28 Q 20 36 36 22" stroke="url(#lWOrange)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>
  );
}

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(formData.email, formData.password);
    if (result.success) {
      toast.success('Login successful');
      navigate('/dashboard');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ──────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(150deg, #0a1628 0%, #0d2244 60%, #0a1f3d 100%)' }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Blue glow top-left */}
        <div
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 65%)' }}
        />
        {/* Orange glow bottom-right */}
        <div
          className="absolute -bottom-24 -right-24 w-[360px] h-[360px] rounded-full opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #f97316, transparent 65%)' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">

          {/* Logo image */}
          <div
            className="mb-10 p-6 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ImageWithFallback
                  src={dashboardImage}
                  alt="Weeg Dashboard"
                  className="w-85 object-contain"
                  style={{ filter: 'drop-shadow(0 4px 24px rgba(14, 164, 233, 0.95))' }}
                />
          </div>

          {/* Tagline */}
          <p className="text-slate-300 text-base leading-relaxed mb-8 max-w-xs">
            The intelligent platform that transforms your business data into actionable insights.
          </p>

          {/* 3 simple bullet points */}
          <div className="flex flex-col gap-3 w-full">
            {[
              { dot: '#0ea5e9', text: 'Real-time KPI dashboards' },
              { dot: '#f97316', text: 'AI-powered predictions & alerts' },
              { dot: '#34d399', text: 'Secure, GDPR-compliant data' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-left px-4 py-3 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.dot }} />
                <span className="text-sm text-slate-300">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #f97316 40%, #0ea5e9 60%, transparent)' }}
        />
      </div>

      {/* ── RIGHT PANEL — form ───────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center mb-8">
            <WeegMark size={48} />
            <h1 className="text-3xl font-black mt-2" style={{ color: '#1e2130' }}>
              <span className="dark:text-white">Weeg</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Where Data Finds <span style={{ color: '#f97316' }}>Balance</span>
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-background border rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Welcome back</h2>
              <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#0284c7' }}
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="h-4 w-4" /> Sign in
                  </span>
                )}
              </Button>
            </form>

            <div className="my-5 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent opacity-60" />

            <div className="text-center text-sm">
              <span className="text-muted-foreground">No account? </span>
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: '#f97316' }}>
                Manager Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}