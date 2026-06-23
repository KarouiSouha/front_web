/**
 * VerifiedSuccessPage.tsx
 *
 * Shown after the manager clicks the email verification link and the
 * backend redirects to /signup/verified.
 *
 * Message: "Email verified — your account is awaiting admin approval."
 */

import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import logoImage from '../components/image/logo.jpeg';

export function VerifiedSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const alreadyVerified = searchParams.get('already') === 'true';

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #fafafa 50%, #f0f9ff 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 10%, #bbf7d0, transparent 55%)' }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 10% 90%, #bae6fd, transparent 55%)' }} />

      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #059669, #10b981 50%, #34d399)' }} />

        <div className="bg-white dark:bg-slate-900 p-10 text-center">

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logoImage} alt="WEEG" className="h-14 object-contain" />
          </div>

          {/* Success icon */}
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
          >
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {alreadyVerified ? 'Already verified!' : 'Email verified!'}
          </h1>

          {/* Main message */}
          <div
            className="rounded-xl p-5 mb-6 text-left"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
          >
            <p className="text-sm text-emerald-800 font-semibold mb-1">
              ✅ Your email address has been successfully verified.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Your account has been submitted for review. An administrator will examine
              your request and you will receive a confirmation email once your account is activated.
            </p>
          </div>

          {/* What happens next */}
          <div
            className="rounded-xl p-5 mb-8 text-left space-y-3"
            style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">What happens next</p>
            {[
              { icon: <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />, text: 'An administrator will review your account request.' },
              { icon: <span className="text-base shrink-0">📧</span>, text: 'You will receive an email with the decision (approval or rejection).' },
              { icon: <span className="text-base shrink-0">🚀</span>, text: 'Once approved, you can log in and start using WEEG.' },
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                {step.icon}
                <span className="text-sm text-slate-600">{step.text}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => navigate('/login')}
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