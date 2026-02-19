import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Shield, 
  TrendingUp, 
  Zap, 
  CheckCircle,
  ArrowRight,
  LayoutDashboard,
  Brain,
  FileSpreadsheet,
  Star,
  Sparkles,
  Upload,
  Bell,
  LineChart,
  AlertTriangle,
  Clock,
  Target,
  TrendingDown,
  Package,
  Calendar,
  Database,
  Download,
  Activity,
  Eye,
  Settings,
  Lock,
  UserCheck,
  X,
  PlayCircle,
  ChevronDown,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { ImageWithFallback } from '../components/image/ImageWithFallback';

export function LandingPage() {
  const [activeRole, setActiveRole] = useState<'agent' | 'manager' | 'admin'>('manager');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const problemSolutions = [
    {
      problem: 'Time-consuming manual Excel reports',
      solution: 'Automatic import and instant reports',
      icon: Upload
    },
    {
      problem: 'Difficulty tracking performance',
      solution: 'Real-time KPI calculations',
      icon: TrendingUp
    },
    {
      problem: 'Decisions based on intuition',
      solution: 'AI predictions and data-driven recommendations',
      icon: Brain
    },
    {
      problem: 'Missed customer risk alerts',
      solution: 'Intelligent notifications and anomaly detection',
      icon: Bell
    }
  ];

  const features = {
    analytics: [
      { icon: Upload, title: 'Automated Excel Import', description: 'Import your data with one click' },
      { icon: LineChart, title: 'Real-time KPI Calculation', description: 'Track your indicators instantly' },
      { icon: FileSpreadsheet, title: 'Detailed Report Generation', description: 'Complete and customizable reports' },
      { icon: Download, title: 'PDF/Excel Export', description: 'Export your data easily' }
    ],
    ai: [
      { icon: TrendingUp, title: 'Sales Predictions', description: 'Anticipate your future performance' },
      { icon: AlertTriangle, title: 'Anomaly Detection', description: 'Identify problems before they worsen' },
      { icon: TrendingDown, title: 'Customer Churn Analysis', description: 'Predict customer loss risks' },
      { icon: Package, title: 'Inventory Optimization', description: 'Intelligent restocking recommendations' },
      { icon: Calendar, title: 'Seasonal Patterns', description: 'Identify sales trends and cycles' }
    ],
    alerts: [
      { icon: Settings, title: 'Configurable Alert Thresholds', description: 'Define your own criteria' },
      { icon: Bell, title: 'Real-time Notifications', description: 'Receive instant alerts' },
      { icon: AlertTriangle, title: 'Proactive Risk Alerts', description: 'Anticipate problems' },
      { icon: Clock, title: 'Alert History', description: 'View complete history' }
    ]
  };

  const roleContent = {
    agent: {
      title: 'For Agents',
      subtitle: 'Save time on your daily reports',
      benefits: [
        { icon: Upload, text: 'Quick data import' },
        { icon: LayoutDashboard, text: 'Customizable dashboards' },
        { icon: Eye, text: 'Instant customer history' }
      ]
    },
    manager: {
      title: 'For Managers',
      subtitle: 'Lead your team with powerful insights',
      benefits: [
        { icon: FileSpreadsheet, text: 'Detailed multi-period reports' },
        { icon: BarChart3, text: 'Performance comparison' },
        { icon: Users, text: 'Simplified team management' }
      ]
    },
    admin: {
      title: 'For Admins',
      subtitle: 'Control and secure your platform',
      benefits: [
        { icon: Users, text: 'User management' },
        { icon: UserCheck, text: 'Account validation' },
        { icon: Lock, text: 'Permission control' }
      ]
    }
  };

  const steps = [
    {
      number: '01',
      title: 'Import Your Data',
      description: 'Upload your Excel files in just a few clicks',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      number: '02',
      title: 'Analyze Automatically',
      description: 'AI calculates your KPIs and identifies trends',
      icon: Brain,
      color: 'from-purple-500 to-pink-500'
    },
    {
      number: '03',
      title: 'Receive Alerts',
      description: 'Intelligent notifications and real-time predictions',
      icon: Bell,
      color: 'from-orange-500 to-red-500'
    },
    {
      number: '04',
      title: 'Act Effectively',
      description: 'Make decisions based on concrete recommendations',
      icon: Target,
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const faqs = [
    {
      question: 'How do I import my data?',
      answer: 'You can import your data in just a few clicks through our intuitive interface. We support Excel files (.xlsx, .xls), CSV, and Google Sheets. A wizard guides you through each step to correctly map your columns.'
    },
    {
      question: 'Is the AI accurate?',
      answer: 'Our AI uses advanced machine learning algorithms trained on millions of transactions. The average accuracy of our predictions is 92%. The more you use the platform, the better the predictions become through continuous learning.'
    },
    {
      question: 'Can I customize KPIs?',
      answer: 'Absolutely! You can create custom KPIs according to your specific needs, define your own calculation formulas, and configure alert thresholds adapted to your business.'
    },
    {
      question: 'What about data security?',
      answer: 'We take security very seriously. Your data is encrypted in transit (SSL/TLS) and at rest (AES-256). We are GDPR compliant and host your data in Europe. Security audits are performed regularly.'
    },
    {
      question: 'Can I change my plan at any time?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.'
    },

  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navigation */}
      <nav className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FASI</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" size="lg" className="text-base">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg text-base">
                  Get Started 
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden py-20 lg:py-32 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-gray-950 dark:to-purple-950/30">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40 rounded-full text-sm font-semibold text-blue-700 dark:text-blue-300 mb-8 border border-blue-200 dark:border-blue-800">
                <Brain className="h-4 w-4" />
                Powered by Artificial Intelligence
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
                Transform Your{' '}
                <span className="relative">
                  <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent">
                    Business Data
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
                </span>
                {' '}Into Actionable Insights
              </h1>
              
              <p className="text-xl lg:text-2xl text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
                The intelligent platform that <strong>automates your reports</strong>, <strong>calculates your KPIs</strong>, and <strong>predicts your business performance</strong> in real-time
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-14">

                <Button size="lg" variant="outline" className="border-2 text-lg px-10 py-7 h-auto hover:bg-gray-50 dark:hover:bg-gray-900">
                  <PlayCircle className="mr-2 h-6 w-6" />
                  Watch Demo
                </Button>
              </div>
            </div>

            <div className="relative lg:mt-0 mt-12">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-3xl opacity-20 blur-2xl" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-900">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMGRhc2hib2FyZCUyMGFuYWx5dGljc3xlbnwxfHx8fDE3NzEyMTQ0NDF8MA&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="FASI Dashboard"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION PROBLEMS/SOLUTIONS */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Your Challenges, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Our Solutions</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              FASI solves the problems you face every day
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {problemSolutions.map((item, index) => (
              <div key={index} className="relative p-8 rounded-2xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 hover:shadow-xl">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-3 shadow-lg">
                      <item.icon className="h-full w-full text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <X className="h-5 w-5 text-red-500" />
                      <p className="text-gray-600 dark:text-gray-400 line-through">{item.problem}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-lg">{item.solution}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SECTION KEY FEATURES */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-sm font-semibold text-blue-700 dark:text-blue-300 mb-6">
              <Star className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Everything You Need
            </h2>
          </div>

          {/* Analytics & Reporting */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2.5 shadow-lg">
                <BarChart3 className="h-full w-full text-white" />
              </div>
              <h3 className="text-3xl font-bold">Analytics & Reporting</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.analytics.map((feature, index) => (
                <div key={index} className="p-6 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all">
                  <feature.icon className="h-10 w-10 text-blue-600 mb-4" />
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Artificial Intelligence */}
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-2.5 shadow-lg">
                <Brain className="h-full w-full text-white" />
              </div>
              <h3 className="text-3xl font-bold">Artificial Intelligence</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
              {features.ai.map((feature, index) => (
                <div key={index} className="p-6 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all">
                  <feature.icon className="h-10 w-10 text-purple-600 mb-4" />
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Alerts & Monitoring */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 p-2.5 shadow-lg">
                <Bell className="h-full w-full text-white" />
              </div>
              <h3 className="text-3xl font-bold">Alerts & Monitoring</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.alerts.map((feature, index) => (
                <div key={index} className="p-6 rounded-xl bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-all">
                  <feature.icon className="h-10 w-10 text-orange-600 mb-4" />
                  <h4 className="font-semibold text-lg mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION BY ROLE */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Adapted to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Every Role</span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Features designed for every member of your team
            </p>
          </div>

          {/* Role Tabs */}
          <div className="flex justify-center gap-4 mb-12">
            <button
              onClick={() => setActiveRole('agent')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'agent'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Agents
            </button>
            <button
              onClick={() => setActiveRole('manager')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'manager'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Managers
            </button>
            <button
              onClick={() => setActiveRole('admin')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                activeRole === 'admin'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Admins
            </button>
          </div>

          {/* Role Content */}
          <div className="max-w-4xl mx-auto">
            <div className="p-10 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-3xl font-bold mb-3">{roleContent[activeRole].title}</h3>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">{roleContent[activeRole].subtitle}</p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {roleContent[activeRole].benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-4 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <benefit.icon className="h-8 w-8 text-blue-600 flex-shrink-0" />
                    <p className="font-medium">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION HOW IT WORKS */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              How It Works
            </h2>
            <p className="text-xl text-blue-100">
              4 simple steps to transform your business
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="mb-6">
                    <div className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${step.color} p-4 mx-auto shadow-xl`}>
                      <step.icon className="h-full w-full text-white" />
                    </div>
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 -z-10">
                      <span className="text-8xl font-bold text-white/10">{step.number}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                  <p className="text-blue-100">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. SECTION DEMO */}
      <section className="py-20 bg-white dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-3xl p-12 lg:p-16 border border-blue-100 dark:border-blue-900">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6">
                  See FASI in Action
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                  Watch how FASI transforms your data into actionable insights in just a few clicks
                </p>
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl text-lg px-8 py-6 h-auto">
                  <PlayCircle className="mr-2 h-6 w-6" />
                  Watch Demo Video
                </Button>
              </div>
              <div className="relative">
                <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white dark:border-gray-900">
                  <ImageWithFallback
                    src="https://images.unsplash.com/photo-1759661966728-4a02e3c6ed91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwdmlzdWFsaXphdGlvbnxlbnwxfHx8fDE3NzEyMTQ0OTF8MA&ixlib=rb-4.1.0&q=80&w=1080"
                    alt="FASI Demo"
                    className="w-full"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-white/90 dark:bg-gray-900/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-xl">
                    <PlayCircle className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Find answers to your questions
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-950"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <span className="font-semibold text-lg">{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-gray-600 transition-transform ${
                      openFaq === index ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === index && (
                  <div className="p-6 pt-0 text-gray-600 dark:text-gray-400 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-gray-400 py-16 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            {/* Logo & Description */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold text-2xl text-white">FASI</span>
              </div>
              <p className="text-sm leading-relaxed">
                The intelligent platform that transforms your business data into actionable insights.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Demo</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <a href="mailto:contact@fasi.io" className="hover:text-white transition-colors">contact@fasi.io</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span>+1 (555) 123-4567</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-1" />
                  <span>San Francisco, CA</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm">
              © 2026 FASI. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Legal</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
