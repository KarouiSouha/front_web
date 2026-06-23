/**
 * EmailVerificationPendingPage.tsx
 *
 * Shown immediately after a Manager creates their account.
 * Tells the manager to check their inbox and click the verification link.
 * Provides a "Resend" button in case the email was lost.
 *
 * Routes involved:
 *   /signup/verify-email        ← this page (navigate from SignupPage on success)
 *   /signup/verified            ← VerifiedSuccessPage (redirect from backend after token click)
 *   /signup/verification-failed ← shown on invalid/expired token
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { authApi } from '../lib/authApi';
import logoImage from '../components/image/logo.jpeg';

export function EmailVerificationPendingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Email passed via navigate state from SignupPage
  const email: string = (location.state as { email?: string })?.email ?? '';

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  // If no email in state, the user landed here directly — send them back
  useEffect(() => {
    if (!email) navigate('/signup', { replace: true });
  }, [email, navigate]);

  // Countdown timer after resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (resendStatus === 'loading' || cooldown > 0) return;
    setResendStatus('loading');
    try {
      await authApi.resendVerificationEmail(email);
      setResendStatus('sent');
      setCooldown(120); // 2 min cooldown (matches backend throttle)
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fafafa 50%, #fff7ed 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 10%, #bae6fd, transparent 55%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 10% 90%, #fed7aa, transparent 55%)' }} />

      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
        {/* Top accent bar */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed 50%, #0ea5e9)' }} />

        <div className="bg-white dark:bg-slate-900 p-10 text-center">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="WEEG" className="h-14 object-contain" />
          </div>

          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Mail className="h-9 w-9 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            Check your inbox
          </h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            We sent a verification link to:
          </p>

          {/* Email badge */}
          <div
            className="inline-block rounded-xl px-5 py-2 mb-6 font-semibold text-sm"
            style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
          >
            {email}
          </div>

          {/* Steps */}
          <div
            className="rounded-xl p-5 mb-6 text-left space-y-3"
            style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
          >
            {[
              { icon: '✉️', text: 'Open the email from WEEG in your inbox' },
              { icon: '🔗', text: 'Click the "Verify my email address" button' },
              { icon: '⏳', text: 'Your account will then await admin approval' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">{step.icon}</span>
                <span className="text-sm text-slate-600">{step.text}</span>
              </div>
            ))}
          </div>

          {/* Expiry note */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              The verification link expires in <strong>24 hours</strong>.
            </p>
          </div>

          {/* Resend section */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-sm text-slate-500 mb-3">Didn't receive the email?</p>

            {resendStatus === 'sent' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Email resent successfully!
              </div>
            ) : (
              <Button
                onClick={handleResend}
                disabled={resendStatus === 'loading' || cooldown > 0}
                variant="outline"
                className="w-full h-10 text-sm font-semibold border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              >
                {resendStatus === 'loading' ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Sending...
                  </span>
                ) : cooldown > 0 ? (
                  `Resend available in ${cooldown}s`
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" /> Resend verification email
                  </span>
                )}
              </Button>
            )}

            {resendStatus === 'error' && (
              <p className="text-xs text-red-500 mt-2">
                Failed to resend. Please try again in a moment.
              </p>
            )}
          </div>

          {/* Back link */}
          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to signup
          </Link>

        </div>
      </div>
    </div>
  );
}