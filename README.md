# WEEG - Smart Inventory & Financial Intelligence System

A modern SaaS platform for intelligent multi-branch inventory management, financial analysis, customer risk assessment, and automated AI-powered KPIs.

## Features

### 📊 Dashboard Overview
- 8 interactive KPI cards with trends and sparklines
- Sales vs Purchases comparison chart
- Branch performance analysis
- Aging receivables distribution
- Top risky customers
- Top 10 products by sales
- Real-time data visualization

### 📤 Data Import Center
- Drag & drop Excel file upload
- Template downloads for different data types
- Role-based access control (Agent/Manager)
- File validation and preview
- Progress tracking with visual pipeline
- Error detection and reporting

### 💰 KPI Engine Dashboard
- Automated KPI calculation
- Product & Inventory metrics
- Customer KPIs
- Interactive filters (Period, Branch, Product)
- Tooltips with formula explanations
- Real-time performance tracking

### 🛒 Sales & Purchases
- Complete transaction history
- Advanced filtering and search
- Export to CSV, Excel, PDF
- Pagination and sorting
- Transaction details with status badges

### 📦 Multi-Branch Inventory
- Branch-specific inventory cards
- Stock level monitoring
- Low stock alerts
- Visual progress bars for stock levels
- Real-time stock value calculation
- Cross-branch comparison

### 🚨 Smart Alerts
- AI-powered alert generation
- Multiple alert types (Low Stock, Overdue, High Sales, etc.)
- Severity indicators (Low, Medium, Critical)
- AI explanations for each alert
- Alert status tracking (Pending/Resolved)
- Confidence scores

### 👥 Aging Receivables
- Customer payment aging analysis
- 0-30, 31-60, 61-90, 90+ days breakdown
- Top 5 risky customers with risk scores
- Monthly receivables trend
- Payment status tracking
- Action buttons for invoice management

### 📈 Reports
- Inventory Turnover Report
- Pricing & Profitability Report
- Risk Assessment Report
- Supply Policy Report
- Distribution Behavior Report
- Aging Receivables Report
- Interactive chart previews
- Export functionality

### 🤖 AI Insights
- Seasonal pattern detection
- Customer risk prediction
- Inventory optimization suggestions
- Price optimization recommendations
- Anomaly detection
- AI confidence scores
- Actionable recommendations

### ⚙️ Settings
- Profile management
- Company information
- Notification preferences
- Security settings
- Integration management
- Two-factor authentication

## Design System

### Color Palette
- **Primary**: Deep Indigo (#4F46E5)
- **Background**: Slate-50 / Gray-50
- **Status Colors**:
  - 🟢 Green: Normal / Healthy
  - 🟡 Yellow: Warning (31-60 days)
  - 🔴 Red: Critical / Danger (>60 days)

### UI Components
- Cards with subtle shadows and hover effects
- Rounded corners (12px / rounded-xl)
- Gradient accents for important elements
- Smooth transitions and animations
- Responsive grid layouts

### Typography
- Font: Inter (system default)
- Clear hierarchy (H1: 32px, H2: 24px, H3: 20px, H4: 18px)
- Readable body text (14px base)

### Dark Mode
- Full dark mode support using next-themes
- Optimized color contrast
- Smooth theme transitions
- Persistent theme preference

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **next-themes** - Dark mode support

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   ├── Header.tsx       # Top navigation bar
│   │   ├── Sidebar.tsx      # Side navigation
│   │   ├── KPICard.tsx      # KPI display card
│   │   ├── DataTable.tsx    # Data table with filtering
│   │   ├── ChartCard.tsx    # Chart container
│   │   ├── EmptyState.tsx   # Empty state placeholder
│   │   └── LoadingState.tsx # Loading skeletons
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── DataImportPage.tsx
│   │   ├── KPIEnginePage.tsx
│   │   ├── SalesPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── AlertsPage.tsx
│   │   ├── AgingPage.tsx
│   │   ├── ReportsPage.tsx
│   │   ├── AIInsightsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── lib/
│   │   ├── mockData.ts      # Mock data generator
│   │   └── utils.ts         # Utility functions
│   └── App.tsx              # Main application
└── styles/
    ├── theme.css            # Theme variables
    ├── tailwind.css         # Tailwind directives
    └── index.css            # Global styles
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

## Key Features Implementation

### Mock Data System
- Realistic business data generation
- 12+ products with inventory
- 4 branches with locations
- Sales and purchase transactions
- Customer accounts with risk scores
- Aging receivables
- Smart alerts with AI explanations

### Responsive Design
- **Desktop (>1280px)**: Full layout with sidebar
- **Tablet (768px-1280px)**: Collapsible sidebar
- **Mobile (<768px)**: Bottom navigation, stacked layout

### Performance Optimizations
- Lazy loading for heavy components
- Efficient data filtering and pagination
- Optimized chart rendering
- Minimal re-renders

## User Roles

### Manager
- Full access to all features
- Can import all data types
- Access to financial reports
- Customer risk analysis

### Agent
- Limited import capabilities (Sales, Stock only)
- View-only access to reports
- Basic inventory management

## Future Enhancements

- Real backend integration (Supabase/Firebase)
- Real-time data synchronization
- Advanced AI models for predictions
- Multi-language support
- Mobile app version
- Advanced reporting with custom filters
- Email notifications
- API integrations



Built with ❤️ using React, TypeScript, and Tailwind CSS
