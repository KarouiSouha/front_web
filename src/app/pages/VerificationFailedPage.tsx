/**
 * VerificationFailedPage.tsx
 *
 * Shown when the backend redirects to /signup/verification-failed.
 * Displays an appropriate message based on the `reason` query param.
 *
 * Possible reasons: missing_token | expired | not_found
 */

import { useSearchParams, useNavigate } from 'react-router';
import { XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import logoImage from '../components/image/logo.jpeg';

const MESSAGES: Record<string, { title: string; body: string }> = {
  missing_token: {
    title: 'Invalid link',
    body: 'The verification link is incomplete. Please check your email and click the full link.',
  },
  expired: {
    title: 'Link expired',
    body: 'This verification link has expired (valid for 24 hours). Please request a new one.',
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

export function VerificationFailedPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason') ?? 'default';
  const msg = MESSAGES[reason] ?? MESSAGES.default;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
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

          <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{msg.title}</h1>

          <div
            className="rounded-xl p-5 mb-8"
            style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
          >
            <p className="text-sm text-red-700 leading-relaxed">{msg.body}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/signup')}
              className="flex-1 h-10 text-sm font-semibold"
            >
              Back to signup
            </Button>
            <Button
              onClick={() => navigate('/signup/verify-email', { state: {} })}
              className="flex-1 h-10 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Resend email
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}