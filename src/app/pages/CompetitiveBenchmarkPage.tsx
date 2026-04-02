import { Button } from '../components/ui/button';
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Clock, 
  Target,
  CheckCircle2,
  AlertCircle,
  Users,
  BarChart3,
  LineChart,
  Database,
  ArrowRight,
  X
} from 'lucide-react';
import { Link } from 'react-router';
import { useState, useEffect } from 'react';
import '../../styles/benchmark.css';

interface ComparisonFeature {
  category: string;
  feature: string;
  classicERP: string;
  weeqAI: string;
  advantage: 'weeg' | 'both' | 'classic';
}

const comparisonData: ComparisonFeature[] = [
  {
    category: 'Analyse des données',
    feature: 'Détection d\'anomalies',
    classicERP: 'Tableaux de bord statiques',
    weeqAI: 'Détection automatique en temps réel',
    advantage: 'weeg',
  },
  {
    category: 'Analyse des données',
    feature: 'Insights prédictifs',
    classicERP: 'Chiffres rétrospectifs',
    weeqAI: 'Prédictions IA avec probabilités',
    advantage: 'weeg',
  },
  {
    category: 'Gestion des clients',
    feature: 'Récupération des impayés',
    classicERP: 'Suivi manuel, risqué (+20% perte)',
    weeqAI: 'Moteur intelligent (-90% perte)',
    advantage: 'weeg',
  },
  {
    category: 'Gestion des stocks',
    feature: 'Prévision de demande',
    classicERP: 'Moyenne simple / surstock',
    weeqAI: 'ML avec historique (-30% ruptures)',
    advantage: 'weeg',
  },
  {
    category: 'Alertes et actions',
    feature: 'Notifications',
    classicERP: 'Alertes dumb (trop)',
    weeqAI: 'Alertes intelligentes + recommandations',
    advantage: 'weeg',
  },
  {
    category: 'Intégration de données',
    feature: 'Import & enrichissement',
    classicERP: 'Import brut, sans validation',
    weeqAI: 'Import intelligent avec déduplication',
    advantage: 'weeg',
  },
  {
    category: 'Performance',
    feature: 'Réactivité',
    classicERP: 'Rapports 24-48h',
    weeqAI: 'Dashboards temps réel',
    advantage: 'weeg',
  },
  {
    category: 'Support décisionnel',
    feature: 'Recommandations',
    classicERP: 'Aucune',
    weeqAI: 'Actions proactives recommandées',
    advantage: 'weeg',
  },
  {
    category: 'Scalabilité',
    feature: 'Gestion multi-sites',
    classicERP: 'Configuration complexe',
    weeqAI: 'Multi-tenant natif',
    advantage: 'weeg',
  },
  {
    category: 'ROI',
    feature: 'Temps de déploiement',
    classicERP: '6-12 mois',
    weeqAI: '2-4 semaines',
    advantage: 'weeg',
  },
];

export function CompetitiveBenchmarkPage() {
  const [visibleRows, setVisibleRows] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    // Animate rows on load
    comparisonData.forEach((_, index) => {
      setTimeout(() => {
        setVisibleRows((prev) => [...prev, index]);
      }, index * 80);
    });
  }, []);

  const categories = Array.from(new Set(comparisonData.map((d) => d.category)));
  const filteredData = selectedCategory 
    ? comparisonData.filter((d) => d.category === selectedCategory)
    : comparisonData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Benchmark Compétitif
              </h1>
              <p className="text-sm text-slate-600 mt-2">
                Découvrez pourquoi WEEG avec l'IA surpasse les ERP classiques
              </p>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Fermer
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Brain, label: 'Intelligence IA', value: '24/7' },
            { icon: Zap, label: 'Reactivity', value: 'Real-time' },
            { icon: TrendingUp, label: 'Prévision', value: '+90% précis' },
            { icon: Clock, label: 'Déploiement', value: '2-4 semaines' },
          ].map((metric, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-300 metric-card"
            >
              <metric.icon className="h-8 w-8 text-blue-600 mb-3" />
              <p className="text-sm font-medium text-slate-600">{metric.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              selectedCategory === null
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
            }`}
          >
            Tous les domaines
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header */}
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 w-1/4">
                    Fonctionnalité
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-slate-500" />
                      ERP Classique
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center w-12"></th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-blue-700">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      WEEG + IA
                    </div>
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredData.map((item, index) => (
                  <tr
                    key={index}
                    className={`border-b border-slate-100 hover:bg-blue-50 transition-all duration-300 benchmark-row ${
                      visibleRows.includes(index)
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 translate-x-4'
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {/* Feature Name */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          {item.category}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {item.feature}
                        </p>
                      </div>
                    </td>

                    {/* Classic ERP */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        {item.advantage === 'classic' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm ${
                            item.advantage === 'classic'
                              ? 'text-green-700 font-medium'
                              : 'text-slate-600'
                          }`}
                        >
                          {item.classicERP}
                        </span>
                      </div>
                    </td>

                    {/* Arrow Indicator */}
                    <td className="px-6 py-4 text-center">
                      {item.advantage === 'weeg' && (
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ArrowRight className="h-5 w-5 text-blue-600 advantage-arrow" />
                          </div>
                        </div>
                      )}
                    </td>

                    {/* WEEG AI */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-medium text-blue-700">
                          {item.weeqAI}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white text-center cta-section"
             style={{ animation: 'fadeInUp 0.8s ease-out 0.3s forwards' }}>
          <h3 className="text-2xl font-bold mb-2">
            Prêt à transformer votre gestion d'entreprise ?
          </h3>
          <p className="text-blue-100 mb-6">
            Découvrez comment WEEG peut automatiser et optimiser votre business
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" variant="secondary">
                Commencer maintenant
              </Button>
            </Link>
            <Link to="/">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Retour à l'accueil
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: 'Adopté par les leaders',
              description: 'Les plus grandes entreprises font confiance à WEEG',
            },
            {
              icon: BarChart3,
              title: 'Résultats mesurables',
              description: 'ROI visible en moins de 2 mois d\'utilisation',
            },
            {
              icon: Zap,
              title: 'Support 24/7',
              description: 'Équipe dédiée avec IA pour assistance instantanée',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-6 text-center hover:shadow-lg transition-shadow duration-300"
            >
              <item.icon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-slate-900 mb-2">{item.title}</h4>
              <p className="text-sm text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
