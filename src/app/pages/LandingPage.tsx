import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import {
  BarChart3,
  Users,
  TrendingUp,
  Brain,
  FileSpreadsheet,
  Upload,
  Bell,
  LineChart,
  AlertTriangle,
  Clock,
  Target,
  TrendingDown,
  Package,
  Calendar,
  Download,
  Eye,
  Settings,
  Lock,
  UserCheck,
  X,
  PlayCircle,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  LayoutDashboard,
  Star,
} from 'lucide-react';
import { ImageWithFallback } from '../components/image/ImageWithFallback';
import dashboardImage from '../components/image/logo.jpeg';

// ── WEEG inline SVG logo mark ──────────────────────────────────────────────
function WeegMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lpWBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="lpWOrange" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <text x="1" y="32" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="31" fill="url(#lpWBlue)">W</text>
      <path d="M 3 29 Q 20 38 37 23" stroke="url(#lpWOrange)" strokeWidth="2.8" strokeLinecap="round" fill="none" opacity="0.95" />
    </svg>
  );
}

export function LandingPage() {
  const [activeRole, setActiveRole] = useState<'agent' | 'manager' | 'admin'>('manager');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const problemSolutions = [
    { problem: 'Time-consuming manual Excel reports',     solution: 'Automatic import and instant reports',              icon: Upload },
    { problem: 'Difficulty tracking performance',          solution: 'Real-time KPI calculations',                       icon: TrendingUp },
    { problem: 'Decisions based on intuition',             solution: 'AI predictions and data-driven recommendations',   icon: Brain },
    { problem: 'Missed customer risk alerts',              solution: 'Intelligent notifications and anomaly detection',   icon: Bell },
  ];

  const features = {
    analytics: [
      { icon: Upload,        title: 'Automated Excel Import',      description: 'Import your data with one click' },
      { icon: LineChart,     title: 'Real-time KPI Calculation',   description: 'Track your indicators instantly' },
      { icon: FileSpreadsheet, title: 'Detailed Report Generation', description: 'Complete and customizable reports' },
      { icon: Download,      title: 'PDF/Excel Export',            description: 'Export your data easily' },
    ],
    ai: [
      { icon: TrendingUp,   title: 'Sales Predictions',          description: 'Anticipate your future performance' },
      { icon: AlertTriangle, title: 'Anomaly Detection',         description: 'Identify problems before they worsen' },
      { icon: TrendingDown, title: 'Customer Churn Analysis',    description: 'Predict customer loss risks' },
      { icon: Package,      title: 'Inventory Optimization',     description: 'Intelligent restocking recommendations' },
      { icon: Calendar,     title: 'Seasonal Patterns',          description: 'Identify sales trends and cycles' },
    ],
    alerts: [
      { icon: Settings,      title: 'Configurable Thresholds',  description: 'Define your own criteria' },
      { icon: Bell,          title: 'Real-time Notifications',  description: 'Receive instant alerts' },
      { icon: AlertTriangle, title: 'Proactive Risk Alerts',    description: 'Anticipate problems' },
      { icon: Clock,         title: 'Alert History',            description: 'View complete history' },
    ],
  };

  const roleContent = {
    agent: {
      title: 'For Agents',
      subtitle: 'Save time on your daily reports',
      benefits: [
        { icon: Upload,          text: 'Quick data import' },
        { icon: LayoutDashboard, text: 'Customizable dashboards' },
        { icon: Eye,             text: 'Instant customer history' },
      ],
    },
    manager: {
      title: 'For Managers',
      subtitle: 'Lead your team with powerful insights',
      benefits: [
        { icon: FileSpreadsheet, text: 'Detailed multi-period reports' },
        { icon: BarChart3,       text: 'Performance comparison' },
        { icon: Users,           text: 'Simplified team management' },
      ],
    },
    admin: {
      title: 'For Admins',
      subtitle: 'Control and secure your platform',
      benefits: [
        { icon: Users,     text: 'User management' },
        { icon: UserCheck, text: 'Account validation' },
        { icon: Lock,      text: 'Permission control' },
      ],
    },
  };

  const steps = [
    { number: '01', title: 'Import Your Data',    description: 'Upload your Excel files in just a few clicks',            icon: Upload,  color: '#0284c7' },
    { number: '02', title: 'Analyze Automatically', description: 'AI calculates your KPIs and identifies trends',         icon: Brain,   color: '#0ea5e9' },
    { number: '03', title: 'Receive Alerts',       description: 'Intelligent notifications and real-time predictions',    icon: Bell,    color: '#f97316' },
    { number: '04', title: 'Act Effectively',      description: 'Make decisions based on concrete recommendations',        icon: Target,  color: '#ea580c' },
  ];

  const faqs = [
    { question: 'How do I import my data?',        answer: 'You can import your data in just a few clicks through our intuitive interface. We support Excel files (.xlsx, .xls), CSV, and Google Sheets. A wizard guides you through each step to correctly map your columns.' },
    { question: 'Is the AI accurate?',              answer: 'Our AI uses advanced machine learning algorithms trained on millions of transactions. The average accuracy of our predictions is 92%. The more you use the platform, the better the predictions become through continuous learning.' },
    { question: 'Can I customize KPIs?',            answer: 'Absolutely! You can create custom KPIs according to your specific needs, define your own calculation formulas, and configure alert thresholds adapted to your business.' },
    { question: 'What about data security?',        answer: 'We take security very seriously. Your data is encrypted in transit (SSL/TLS) and at rest (AES-256). We are GDPR compliant and host your data in Europe. Security audits are performed regularly.' },
    { question: 'Can I change my plan at any time?', answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── NAVIGATION ─────────────────────────────────────────────────── */}
      <nav className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-md sticky top-0 z-50"
           style={{ borderColor: '#e2e8f0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <WeegMark size={38} />
              <div className="flex flex-col leading-none">
                <span className="font-black text-2xl tracking-tight" style={{ color: '#1e2130' }}>
                  <span className="dark:text-white">Weeg</span>
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Where Data Finds <span style={{ color: '#f97316' }} className="font-semibold">Balance</span>
                </span>
              </div>
            </div>

            {/* Nav actions */}
            <div className="flex items-center gap-3">
              <Link to="/login">
                <Button variant="ghost" size="lg" className="text-sm font-semibold text-slate-600 hover:text-sky-600">
                  Sign In
                </Button>
              </Link>
              <Link to="/signup">
                <Button
                  size="lg"
                  className="text-sm font-bold text-white shadow-lg hover:shadow-xl transition-shadow"
                  style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)' }}
                >
                  Get Started →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24 lg:py-36">
        {/* Background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #f0f9ff 0%, #ffffff 50%, #fff7ed 100%)' }} />
        {/* Decorative orbs */}
        <div className="absolute top-[-80px] right-[10%] w-[500px] h-[500px] rounded-full opacity-30 blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] left-[5%] w-[350px] h-[350px] rounded-full opacity-20 blur-3xl pointer-events-none"
             style={{ background: 'radial-gradient(circle, #f97316, transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left */}
            <div>
              
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight mb-7 leading-[1.1]" style={{ color: '#0f172a' }}>
                Transform Your{' '}
                <span className="relative inline-block">
                  <span style={{ background: 'linear-gradient(135deg, #0284c7, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Business Data
                  </span>
                  <span className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, #0284c7, #f97316)' }} />
                </span>
                {' '}Into Actionable Insights
              </h1>

              <p className="text-lg text-slate-500 mb-10 leading-relaxed max-w-xl">
                The intelligent platform that <strong className="text-slate-700">automates your reports</strong>,{' '}
                <strong className="text-slate-700">calculates your KPIs</strong>, and{' '}
                <strong className="text-slate-700">predicts your business performance</strong> in real-time.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Button size="lg" variant="outline" className="text-base px-8 py-6 h-auto border-2 font-semibold text-slate-600"
                        style={{ borderColor: '#e2e8f0' }}>
                  <PlayCircle className="mr-2 h-5 w-5" style={{ color: '#f97316' }} />
                  Watch Demo
                </Button>
              </div>

              {/* Trust indicators */}
              <div className="flex items-center gap-6">
                {[
                  { label: '500+', sub: 'Companies' },
                  { label: '99.9%', sub: 'Uptime' },
                  { label: '92%', sub: 'AI Accuracy' },
                ].map((stat, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-black" style={{ color: '#0284c7' }}>{stat.label}</div>
                    <div className="text-xs text-slate-400 font-medium">{stat.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — dashboard screenshot */}
            <div className="relative">
              {/* Glow halo */}
              <div className="absolute -inset-6 rounded-3xl opacity-25 blur-2xl"
                   style={{ background: 'linear-gradient(135deg, #0284c7, #f97316)' }} />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl"
                   style={{ border: '3px solid white' }}>
                <ImageWithFallback
                  src={dashboardImage}
                  alt="Weeg Dashboard"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. PROBLEMS / SOLUTIONS ──────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#0f172a' }}>
              Your Challenges,{' '}
              <span style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Our Solutions
              </span>
            </h2>
            <p className="text-lg text-slate-500">Weeg solves the problems you face every day</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {problemSolutions.map((item, i) => (
              <div key={i} className="relative p-7 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl group"
                   style={{ borderColor: '#e2e8f0', background: '#fafafa' }}
                   onMouseEnter={e => (e.currentTarget.style.borderColor = '#0284c7')}
                   onMouseLeave={e => (e.currentTarget.style.borderColor = '#e2e8f0')}>
                <div className="flex items-start gap-5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                       style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
                    <item.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <X className="h-4 w-4 text-red-400" />
                      <p className="text-slate-400 line-through text-sm">{item.problem}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 shrink-0" style={{ color: '#0284c7' }} />
                      <p className="font-bold text-lg text-slate-800">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. KEY FEATURES ──────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-5"
                 style={{ background: '#f0f9ff', color: '#0284c7', border: '1px solid #bae6fd' }}>
              <Star className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold" style={{ color: '#0f172a' }}>Everything You Need</h2>
          </div>

          {/* Analytics */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-7">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md"
                   style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)' }}>
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Analytics & Reporting</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.analytics.map((f, i) => (
                <div key={i} className="p-6 rounded-xl bg-white border transition-all hover:shadow-lg hover:-translate-y-0.5"
                     style={{ borderColor: '#e2e8f0' }}>
                  <f.icon className="h-9 w-9 mb-4" style={{ color: '#0284c7' }} />
                  <h4 className="font-bold text-slate-800 mb-1">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* AI */}
          <div className="mb-14">
            <div className="flex items-center gap-3 mb-7">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md"
                   style={{ background: 'linear-gradient(135deg, #0ea5e9, #38bdf8)' }}>
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Artificial Intelligence</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-5">
              {features.ai.map((f, i) => (
                <div key={i} className="p-6 rounded-xl bg-white border transition-all hover:shadow-lg hover:-translate-y-0.5"
                     style={{ borderColor: '#e2e8f0' }}>
                  <f.icon className="h-9 w-9 mb-4" style={{ color: '#0ea5e9' }} />
                  <h4 className="font-bold text-slate-800 mb-1">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts */}
          <div>
            <div className="flex items-center gap-3 mb-7">
              <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md"
                   style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                <Bell className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800">Alerts & Monitoring</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.alerts.map((f, i) => (
                <div key={i} className="p-6 rounded-xl bg-white border transition-all hover:shadow-lg hover:-translate-y-0.5"
                     style={{ borderColor: '#e2e8f0' }}>
                  <f.icon className="h-9 w-9 mb-4" style={{ color: '#f97316' }} />
                  <h4 className="font-bold text-slate-800 mb-1">{f.title}</h4>
                  <p className="text-sm text-slate-500">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. BY ROLE ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#0f172a' }}>
              Adapted to{' '}
              <span style={{ background: 'linear-gradient(135deg, #0284c7, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Every Role
              </span>
            </h2>
            <p className="text-lg text-slate-500">Features designed for every member of your team</p>
          </div>

          {/* Role tabs */}
          <div className="flex justify-center gap-3 mb-10">
            {(['agent', 'manager', 'admin'] as const).map(role => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className="px-6 py-3 rounded-xl font-bold capitalize transition-all text-sm"
                style={
                  activeRole === role
                    ? { background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', color: 'white', boxShadow: '0 4px 15px rgba(2,132,199,0.35)' }
                    : { background: '#f1f5f9', color: '#64748b' }
                }
              >
                {role === 'agent' ? 'Agents' : role === 'manager' ? 'Managers' : 'Admins'}
              </button>
            ))}
          </div>

          <div className="max-w-4xl mx-auto p-10 rounded-2xl border-2"
               style={{ background: 'linear-gradient(135deg, #f0f9ff, #fff7ed)', borderColor: '#bae6fd' }}>
            <h3 className="text-3xl font-bold mb-2 text-slate-800">{roleContent[activeRole].title}</h3>
            <p className="text-slate-500 mb-8 text-lg">{roleContent[activeRole].subtitle}</p>
            <div className="grid md:grid-cols-3 gap-5">
              {roleContent[activeRole].benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-xl bg-white border"
                     style={{ borderColor: '#e2e8f0' }}>
                  <b.icon className="h-7 w-7 shrink-0 mt-0.5" style={{ color: '#0284c7' }} />
                  <p className="font-semibold text-slate-700">{b.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="py-24 text-white relative overflow-hidden"
               style={{ background: 'linear-gradient(135deg, #0c2340 0%, #0f2f5a 50%, #1a1a2e 100%)' }}>
        {/* Decorative */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-10 blur-3xl"
             style={{ background: 'radial-gradient(circle, #38bdf8, transparent)' }} />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
             style={{ background: 'radial-gradient(circle, #f97316, transparent)' }} />
        {/* Orange sweep line */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
             style={{ background: 'linear-gradient(90deg, transparent, #f97316, #0ea5e9, transparent)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-sky-300 text-lg">4 simple steps to transform your business</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Step number watermark */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-8xl font-black opacity-5 select-none">
                  {step.number}
                </div>
                {/* Icon */}
                <div className="relative z-10 h-20 w-20 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-2xl transition-transform group-hover:-translate-y-1"
                     style={{ background: step.color }}>
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sky-200 text-sm leading-relaxed">{step.description}</p>

                {/* Connector */}
                {i < 3 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+48px)] w-[calc(100%-96px)] h-px opacity-30"
                       style={{ background: 'linear-gradient(90deg, #38bdf8, #f97316)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. DEMO ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-12 lg:p-16 border-2 overflow-hidden relative"
               style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #fff7ed 100%)', borderColor: '#bae6fd' }}>
            {/* Decorative swoosh */}
            <div className="absolute -bottom-10 -right-10 w-60 h-60 rounded-full opacity-20 blur-3xl"
                 style={{ background: '#f97316' }} />

            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-5" style={{ color: '#0f172a' }}>
                  See <span style={{ background: 'linear-gradient(135deg, #0284c7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Weeg</span> in Action
                </h2>
                <p className="text-slate-500 text-lg mb-8">
                  Watch how Weeg transforms your data into actionable insights in just a few clicks.
                </p>
                <Button
                  size="lg"
                  className="text-white font-bold text-base px-8 py-6 h-auto shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
                >
                  <PlayCircle className="mr-2 h-6 w-6" />
                  Watch Demo Video
                </Button>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ border: '3px solid white' }}>
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1759661966728-4a02e3c6ed91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwdmlzdWFsaXphdGlvbnxlbnwxfHx8fDE3NzEyMTQ0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="Weeg Demo"
                    className="w-full"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-white/95 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-2xl">
                    <PlayCircle className="h-11 w-11" style={{ color: '#f97316' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="py-20" style={{ background: '#f8fafc' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl lg:text-5xl font-bold mb-4" style={{ color: '#0f172a' }}>
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-lg">Find answers to your questions</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl overflow-hidden border bg-white transition-shadow hover:shadow-md"
                   style={{ borderColor: openFaq === i ? '#0284c7' : '#e2e8f0' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-bold text-slate-800 text-base">{faq.question}</span>
                  <ChevronDown
                    className="h-5 w-5 transition-transform shrink-0 ml-4"
                    style={{ color: '#0284c7', transform: openFaq === i ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-slate-500 leading-relaxed text-sm border-t"
                       style={{ borderColor: '#f0f9ff', background: '#fafeff' }}>
                    <div className="pt-4">{faq.answer}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-16 border-t" style={{ background: '#0c1a2e', borderColor: '#1e3a5f' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <WeegMark size={36} />
                <div>
                  <span className="font-black text-xl text-white">Weeg</span>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Where Data Finds <span style={{ color: '#f97316' }}>Balance</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                The intelligent platform that transforms your business data into actionable insights.
              </p>
              {/* Brand accent line */}
              <div className="mt-5 h-0.5 w-24 rounded-full"
                   style={{ background: 'linear-gradient(90deg, #0284c7, #f97316)' }} />
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                {['Features', 'Pricing', 'Demo', 'API'].map(l => (
                  <li key={l}><a href="#" className="hover:text-sky-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Resources</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                {['Documentation', 'Guides', 'Blog', 'Support'].map(l => (
                  <li key={l}><a href="#" className="hover:text-sky-400 transition-colors">{l}</a></li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-4 text-sm uppercase tracking-wide">Contact</h4>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" style={{ color: '#0ea5e9' }} />
                  <a href="mailto:weeg@digitalia.ly" className="hover:text-sky-400 transition-colors">weeg@digitalia.ly</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" style={{ color: '#0ea5e9' }} />
                  <span>+216 21547607</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5" style={{ color: '#0ea5e9' }} />
                  <span>Bizerte, Tunisia</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom */}
          <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
               style={{ borderColor: '#1e3a5f' }}>
            <div className="text-sm text-slate-500">© 2026 Weeg. All rights reserved.</div>
            <div className="flex gap-6 text-sm text-slate-500">
              {['Legal', 'Privacy', 'Terms'].map(l => (
                <a key={l} href="#" className="hover:text-sky-400 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}