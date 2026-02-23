import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Link, useNavigate } from 'react-router';
import { Eye, EyeOff, UserPlus, Check, Building2, Mail, Phone, User, Lock } from 'lucide-react';
import { toast } from 'sonner';
import logoImage from '../components/image/logo.jpeg';

export function SignupPage() {
  const { signup, isLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName.trim()) { toast.error('Company name is required'); return; }
    if (formData.password !== formData.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (formData.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    const result = await signup({
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      role: 'manager',
      companyName: formData.companyName.trim(),
    });
    if (result.success) {
      toast.success(result.message);
      setTimeout(() => navigate('/login'), 2000);
    } else {
      toast.error(result.message);
    }
  };

  const field = (
    id: string,
    label: string,
    type: string,
    placeholder: string,
    value: string,
    onChange: (v: string) => void,
    icon: React.ReactNode,
    required = true,
    hint?: string
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}{required && <span className="text-sky-500 ml-0.5">*</span>}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          disabled={isLoading}
          className="pl-9 h-10 text-sm border-slate-200 focus:border-sky-400 focus:ring-sky-400/20 bg-slate-50 dark:bg-slate-800/50"
        />
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fafafa 50%, #fff7ed 100%)' }}
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-30 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 80% 10%, #bae6fd, transparent 55%)' }} />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 10% 90%, #fed7aa, transparent 55%)' }} />

      {/* Geometric accent — top-left */}
      <div className="absolute top-10 left-10 w-24 h-24 rounded-2xl opacity-10 rotate-12 pointer-events-none"
        style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)' }} />
      {/* Geometric accent — bottom-right */}
      <div className="absolute bottom-10 right-10 w-16 h-16 rounded-full opacity-10 pointer-events-none"
        style={{ background: '#f97316' }} />
      <div className="absolute bottom-24 right-20 w-8 h-8 rounded-full opacity-15 pointer-events-none"
        style={{ background: '#0284c7' }} />

      {/* ── Main card ── */}
      <div
        className="w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl"
        style={{ border: '1px solid rgba(0,0,0,0.07)' }}
      >
        {/* Card top stripe */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #0284c7, #38bdf8 50%, #f97316)' }} />

        <div className="bg-white dark:bg-slate-900 p-10">

          {/* ── Card header — logo left, sign-in right ── */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            {/* Logo */}
            <img src={logoImage} alt="Weeg" className="h-20 object-contain" />

            {/* Sign in pill */}
            <Link
              to="/login"
              className="group flex items-center gap-3 rounded-xl px-4 py-2.5 border transition-all hover:shadow-md"
              style={{
                borderColor: '#e2e8f0',
                background: 'linear-gradient(135deg, #f8fafc, #f0f9ff)',
              }}
            >
              <div className="text-right">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 leading-none mb-0.5">
                  Already registered?
                </p>
                <p className="text-sm font-black leading-none" style={{ color: '#0284c7' }}>
                  Sign in
                </p>
              </div>
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0 transition-transform group-hover:translate-x-0.5"
                style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>

          {/* Title + step indicator */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white leading-none mb-2">
                Create your account
              </h1>
              <p className="text-slate-400 text-sm">Manager access · Pending administrator approval</p>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-2 w-8 rounded-full" style={{ background: '#0284c7' }} />
              <div className="h-2 w-8 rounded-full" style={{ background: '#bae6fd' }} />
              <div className="h-2 w-8 rounded-full" style={{ background: '#bae6fd' }} />
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* ── Section 1 — Identity ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>1</div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Identity</span>
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field('firstName', 'First name', 'text', 'John', formData.firstName,
                  v => setFormData({ ...formData, firstName: v }),
                  <User className="h-4 w-4" />)}
                {field('lastName', 'Last name', 'text', 'Doe', formData.lastName,
                  v => setFormData({ ...formData, lastName: v }),
                  <User className="h-4 w-4" />)}
              </div>
            </div>

            {/* ── Section 2 — Contact ── */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>2</div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Contact & Company</span>
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {field('email', 'Email', 'email', 'your@email.com', formData.email,
                  v => setFormData({ ...formData, email: v }),
                  <Mail className="h-4 w-4" />)}
                {field('phone', 'Phone', 'tel', '+216 xx xxx xxx', formData.phone,
                  v => setFormData({ ...formData, phone: v }),
                  <Phone className="h-4 w-4" />, false)}
              </div>
              <div className="mt-4">
                {field('companyName', 'Company name', 'text', 'Official company name', formData.companyName,
                  v => setFormData({ ...formData, companyName: v }),
                  <Building2 className="h-4 w-4" />, true,
                  'If the company already exists, you will be linked to it.')}
              </div>
            </div>

            {/* ── Section 3 — Security ── */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>3</div>
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Security</span>
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password<span className="text-sky-500 ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required disabled={isLoading}
                      className="pl-9 pr-10 h-10 text-sm border-slate-200 focus:border-sky-400 bg-slate-50 dark:bg-slate-800/50" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Confirm password<span className="text-sky-500 ml-0.5">*</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required disabled={isLoading}
                      className="pl-9 h-10 text-sm border-slate-200 focus:border-sky-400 bg-slate-50 dark:bg-slate-800/50" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom row — info + submit */}
            <div className="flex items-center gap-6">
              {/* Info pill */}
              <div className="flex items-center gap-3 flex-1 rounded-xl px-4 py-3 border"
                style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
                  <Check className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs text-slate-500 leading-snug">
                  <span className="font-semibold text-sky-600">Manager access</span> — reviewed by an admin before activation.
                </p>
              </div>

              {/* Submit */}
              <Button type="submit"
                className="shrink-0 text-white font-bold px-8 h-11 rounded-xl shadow-lg"
                style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', minWidth: '180px' }}
                disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Creating...</span>
                ) : (
                  <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create account</span>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}