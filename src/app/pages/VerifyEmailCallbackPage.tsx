/**
 * VerifyEmailCallbackPage.tsx
 *
 * Une seule page pour /signup/verify-email
 *
 * Cas 1 — pas de token dans l'URL (vient de SignupPage) :
 *   → affiche "Check your inbox"
 *
 * Cas 2 — token dans l'URL (clic depuis l'email) :
 *   → appelle GET /api/users/verify-email/?token=xxx
 *   → succès  → affiche message + bouton login
 *   → erreur  → affiche message d'erreur
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams, Link } from 'react-router';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { authApi } from '../lib/authApi';
import { apiFetch, ApiError } from '../lib/api';
import logoImage from '../components/image/logo.jpeg';

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function VerifyEmailCallbackPage() {
  const location     = useLocation();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token');
  const email: string = (location.state as { email?: string })?.email ?? '';

  // ── Cas 2 : token dans l'URL ──────────────────────────────────────────────
  if (token) {
    return <TokenVerifier token={token} navigate={navigate} />;
  }

  // ── Cas 1 : pas de token → "check your inbox" ────────────────────────────
  if (!email) {
    // Arrivé directement sans état → retour signup
    navigate('/signup', { replace: true });
    return null;
  }

  return <PendingInboxUI email={email} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cas 2 — vérifie le token via l'API backend existante
// ─────────────────────────────────────────────────────────────────────────────

function TokenVerifier({ token, navigate }: { token: string; navigate: ReturnType<typeof useNavigate> }) {
  const [status, setStatus]       = useState<'loading' | 'success' | 'error'>('loading');
  const [reason, setReason]       = useState('');
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    apiFetch<{ message: string; already_verified: boolean }>(
      `/users/verify-email/?token=${token}`,
      { method: 'GET', skipAuth: true }
    )
      .then((data) => {
        setAlreadyVerified(data.already_verified ?? false);
        setStatus('success');
      })
      .catch((err: unknown) => {
        const reason = (err as ApiError & { data?: { reason?: string } })?.data?.reason ?? 'expired';
        setReason(reason);
        setStatus('error');
      });
  }, [token]);

  // Loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-indigo-600" />
          <p className="text-slate-500 text-sm">Verifying your email address...</p>
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #fafafa 50%, #f0f9ff 100%)' }}
      >
        <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #059669, #10b981 50%, #34d399)' }} />
          <div className="bg-white dark:bg-slate-900 p-10 text-center">

            <div className="flex justify-center mb-6">
              <img src={logoImage} alt="WEEG" className="h-14 object-contain" />
            </div>

            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              <CheckCircle2 className="h-9 w-9 text-white" />
            </div>

            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">
              {alreadyVerified ? 'Already verified!' : 'Email verified!'}
            </h1>

            <div
              className="rounded-xl p-5 mb-6 text-left"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <p className="text-sm text-emerald-800 font-semibold mb-2">
                ✅ Your email address has been successfully verified.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Account created! Awaiting verification by the admin.
                You will receive a confirmation email once your account is activated.
              </p>
            </div>

            <div
              className="rounded-xl p-5 mb-8 text-left space-y-3"
              style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">What happens next</p>
              {[
                { icon: '⏳', text: 'An administrator will review your account request.' },
                { icon: '📧', text: 'You will receive an email with the decision (approval or rejection).' },
                { icon: '🚀', text: 'Once approved, you can log in and start using WEEG.' },
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-base shrink-0">{step.icon}</span>
                  <span className="text-sm text-slate-600">{step.text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full h-11 text-sm font-bold text-white rounded-xl"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              Go to login page
            </Button>

          </div>
        </div>
      </div>
    );
  }

  // Error
  const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
    missing_token: {
      title: 'Invalid link',
      body: 'The verification link is incomplete. Please check your email and click the full link.',
    },
    expired: {
      title: 'Link expired',
      body: 'This verification link has expired (valid for 24 hours). Please request a new one from the signup page.',
    },
    not_found: {
      title: 'Account not found',
      body: 'We could not find the account associated with this link. Please register again.',
    },
    default: {
      title: 'Verification failed',
      body: 'We could not verify your email address. Please try again or request a new verification email.',
    },
  };
  const msg = ERROR_MESSAGES[reason] ?? ERROR_MESSAGES.default;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fafafa 50%, #fff7ed 100%)' }}
    >
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #dc2626, #ef4444)' }} />
        <div className="bg-white dark:bg-slate-900 p-10 text-center">

          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="WEEG" className="h-14 object-contain" />
          </div>

          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
          >
            <XCircle className="h-9 w-9 text-white" />
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-4">{msg.title}</h1>

          <div className="rounded-xl p-5 mb-8" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
            <p className="text-sm text-red-700 leading-relaxed">{msg.body}</p>
          </div>

          <Button
            onClick={() => navigate('/signup')}
            className="w-full h-10 text-sm font-semibold"
            variant="outline"
          >
            Back to signup
          </Button>

        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cas 1 — "Check your inbox" (après signup, pas de token)
// ─────────────────────────────────────────────────────────────────────────────

function PendingInboxUI({ email }: { email: string }) {
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown]         = useState(0);

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
      setCooldown(120);
    } catch {
      setResendStatus('error');
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fafafa 50%, #fff7ed 100%)' }}
    >
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 10%, #bae6fd, transparent 55%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 10% 90%, #fed7aa, transparent 55%)' }} />

      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed 50%, #0ea5e9)' }} />
        <div className="bg-white dark:bg-slate-900 p-10 text-center">

          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="WEEG" className="h-14 object-contain" />
          </div>

          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
          >
            <Mail className="h-9 w-9 text-white" />
          </div>

          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Check your inbox</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">We sent a verification link to:</p>

          <div
            className="inline-block rounded-xl px-5 py-2 mb-6 font-semibold text-sm"
            style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe' }}
          >
            {email}
          </div>

          <div className="rounded-xl p-5 mb-6 text-left space-y-3" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
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

          <div className="flex items-center justify-center gap-2 mb-8">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">
              The verification link expires in <strong>24 hours</strong>.
            </p>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
            <p className="text-sm text-slate-500 mb-3">Didn't receive the email?</p>
            {resendStatus === 'sent' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" /> Email resent successfully!
              </div>
            ) : (
              <Button
                onClick={handleResend}
                disabled={resendStatus === 'loading' || cooldown > 0}
                variant="outline"
                className="w-full h-10 text-sm font-semibold border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
              >
                {resendStatus === 'loading' ? (
                  <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Sending...</span>
                ) : cooldown > 0 ? (
                  `Resend available in ${cooldown}s`
                ) : (
                  <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Resend verification email</span>
                )}
              </Button>
            )}
            {resendStatus === 'error' && (
              <p className="text-xs text-red-500 mt-2">Failed to resend. Please try again in a moment.</p>
            )}
          </div>

          <Link
            to="/signup"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mt-6 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to signup
          </Link>

        </div>
      </div>
    </div>
  );
}