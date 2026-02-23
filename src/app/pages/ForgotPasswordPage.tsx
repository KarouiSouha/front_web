import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = '/api/users';

type Step = 'request' | 'verify' | 'reset' | 'done';

// ── WEEG Logo mark ─────────────────────────────────────────────────────────
function WeegMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fpWBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="fpWOrange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <text x="2" y="31" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="30" fill="url(#fpWBlue)">W</text>
      <path d="M 4 28 Q 20 36 36 22" stroke="url(#fpWOrange)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.9" />
    </svg>
  );
}

const StepIndicator = ({ step }: { step: Step }) => {
  const steps = [
    { key: 'request', label: 'Email' },
    { key: 'verify', label: 'Code' },
    { key: 'reset', label: 'Password' },
  ] as const;

  const stepIndex = { request: 0, verify: 1, reset: 2, done: 3 }[step];

  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
            style={{
              background: i < stepIndex ? '#0284c7' : i === stepIndex ? '#e0f2fe' : undefined,
              color: i < stepIndex ? '#fff' : i === stepIndex ? '#0284c7' : '#94a3b8',
              border: i === stepIndex ? '2px solid #0284c7' : undefined,
              backgroundColor: i > stepIndex ? '#f1f5f9' : undefined,
            }}
          >
            {i < stepIndex ? '✓' : i + 1}
          </div>
          <span
            className="text-xs hidden sm:block"
            style={{ color: i === stepIndex ? '#0284c7' : '#94a3b8', fontWeight: i === stepIndex ? 600 : 400 }}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div className="flex-1 h-px mx-1" style={{ background: i < stepIndex ? '#0284c7' : '#e2e8f0' }} />
          )}
        </div>
      ))}
    </div>
  );
};

const Wrapper = ({ children, step }: { children: React.ReactNode; step: Step }) => (
  <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <WeegMark size={52} />
        </div>
        <h1 className="text-3xl font-black" style={{ color: '#1e2130' }}>
          <span className="dark:text-white">Weeg</span>
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Where Data Finds <span style={{ color: '#f97316' }} className="font-semibold">Balance</span>
        </p>
      </div>

      {/* Card */}
      <div className="bg-background border rounded-2xl shadow-xl p-8">
        {children}
      </div>

      {step !== 'done' && (
        <div className="mt-4 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-sky-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </Link>
        </div>
      )}
    </div>
  </div>
);

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('request');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password/request/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? 'An error occurred.'); return; }
      toast.success('Code sent — check your inbox.');
      setStep('verify');
    } catch { toast.error('Unable to reach the server.'); }
    finally { setIsLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attempts_remaining !== undefined) setAttemptsRemaining(data.attempts_remaining);
        toast.error(data.error ?? 'Incorrect code.'); return;
      }
      setResetToken(data.reset_token);
      setStep('reset');
    } catch { toast.error('Unable to reach the server.'); }
    finally { setIsLoading(false); }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/forgot-password/reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword, new_password_confirm: confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(Array.isArray(data.error) ? data.error.join(' ') : data.error ?? 'Error during reset.'); return;
      }
      setStep('done');
    } catch { toast.error('Unable to reach the server.'); }
    finally { setIsLoading(false); }
  };

  if (step === 'request') return (
    <Wrapper step={step}>
      <StepIndicator step={step} />
      <div className="mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full mb-3" style={{ background: '#e0f2fe' }}>
          <Mail className="h-5 w-5" style={{ color: '#0284c7' }} />
        </div>
        <h2 className="text-2xl font-bold">Forgot password</h2>
        <p className="text-muted-foreground text-sm mt-1">Enter your email — we will send you a verification code.</p>
      </div>
      <form onSubmit={handleRequest} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" type="email" placeholder="your@email.com" value={email}
            onChange={e => setEmail(e.target.value)} required disabled={isLoading} autoComplete="email" />
        </div>
        <Button type="submit" className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }} disabled={isLoading}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</> : 'Send code'}
        </Button>
      </form>
    </Wrapper>
  );

  if (step === 'verify') return (
    <Wrapper step={step}>
      <StepIndicator step={step} />
      <div className="mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full mb-3" style={{ background: '#e0f2fe' }}>
          <KeyRound className="h-5 w-5" style={{ color: '#0284c7' }} />
        </div>
        <h2 className="text-2xl font-bold">Code verification</h2>
        <p className="text-muted-foreground text-sm mt-1">A 6-digit code has been sent to <strong>{email}</strong>.</p>
      </div>
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification code</Label>
          <Input id="code" type="text" inputMode="numeric" placeholder="000000" maxLength={6}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
            required disabled={isLoading} className="text-center text-2xl tracking-[0.5em] font-mono" />
          {attemptsRemaining !== null && (
            <p className="text-xs text-amber-600">⚠️ {attemptsRemaining} attempt(s) remaining</p>
          )}
        </div>
        <Button type="submit" className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
          disabled={isLoading || code.length !== 6}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</> : 'Verify code'}
        </Button>
        <Button type="button" variant="ghost" className="w-full text-sm text-muted-foreground"
          onClick={() => { setCode(''); setAttemptsRemaining(null); setStep('request'); }} disabled={isLoading}>
          Resend a new code
        </Button>
      </form>
    </Wrapper>
  );

  if (step === 'reset') return (
    <Wrapper step={step}>
      <StepIndicator step={step} />
      <div className="mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full mb-3" style={{ background: '#e0f2fe' }}>
          <Lock className="h-5 w-5" style={{ color: '#0284c7' }} />
        </div>
        <h2 className="text-2xl font-bold">New password</h2>
        <p className="text-muted-foreground text-sm mt-1">Choose a strong password for your account.</p>
      </div>
      <form onSubmit={handleReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <div className="relative">
            <Input id="new-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={isLoading} className="pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm password</Label>
          <div className="relative">
            <Input id="confirm-password" type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isLoading} className="pr-10" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>
        <Button type="submit" className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
          disabled={isLoading || !newPassword || newPassword !== confirmPassword}>
          {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Resetting...</> : 'Reset password'}
        </Button>
      </form>
    </Wrapper>
  );

  return (
    <Wrapper step={step}>
      <div className="text-center py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Password reset!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Your password has been updated successfully. You can now log in.
        </p>
        <Button className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
          onClick={() => navigate('/login')}>
          Log in
        </Button>
      </div>
    </Wrapper>
  );
}