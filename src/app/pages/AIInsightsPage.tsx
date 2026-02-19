import { Sparkles, TrendingUp, AlertTriangle, Package, DollarSign, Users, Zap, MessageSquare, Send } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const seasonalData = [
  { month: 'Jan', sales: 85 },
  { month: 'Feb', sales: 92 },
  { month: 'Mar', sales: 88 },
  { month: 'Apr', sales: 95 },
  { month: 'May', sales: 103 },
  { month: 'Jun', sales: 98 },
  { month: 'Jul', sales: 115 },
  { month: 'Aug', sales: 122 },
  { month: 'Sep', sales: 108 },
  { month: 'Oct', sales: 98 },
  { month: 'Nov', sales: 105 },
  { month: 'Dec', sales: 125 },
];

export function AIInsightsPage() {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai' as const,
      message: 'Hello! I\'m your AI business assistant. I can help you analyze your data, provide insights, and answer questions about your business performance. How can I assist you today?',
      time: '10:30 AM'
    },
    {
      role: 'manager' as const,
      message: 'Can you explain why sales dropped in the North Branch last week?',
      time: '10:32 AM'
    },
    {
      role: 'ai' as const,
      message: 'Based on my analysis, the North Branch experienced a 15% sales decline last week due to three main factors: 1) Inventory shortage of top-selling items (Laptops and AirPods), 2) A competitor opened nearby with promotional pricing, and 3) Reduced foot traffic due to local construction. I recommend restocking priority items and implementing a targeted promotion to recover market share.',
      time: '10:32 AM'
    }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      const newMessage = {
        role: 'manager' as const,
        message: message,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory([...chatHistory, newMessage]);
      setMessage('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          role: 'ai' as const,
          message: 'Thank you for your question. I\'m analyzing your data to provide the best insights. Based on current trends and historical patterns, I can help you make informed decisions about your business operations.',
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
        </div>
        <p className="text-muted-foreground">
          Intelligent insights and AI-powered recommendations for your business
        </p>
      </div>

      {/* AI Summary Banner */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950 dark:to-violet-950">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 shrink-0">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold mb-2">AI Analysis Summary</h3>
              <p className="text-muted-foreground mb-4">
                Our AI has analyzed your business data and identified 12 key insights and 8 actionable recommendations 
                to optimize your operations and increase profitability.
              </p>
              <div className="flex gap-3">
                <Badge className="bg-indigo-600">12 Insights</Badge>
                <Badge className="bg-violet-600">8 Recommendations</Badge>
                <Badge variant="outline">Updated 2 hours ago</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Pattern Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Seasonal Pattern Detection
              </CardTitle>
              <CardDescription>AI-detected seasonal trends in your sales data</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-3xl">🌡️</span>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Q1 High Demand Period Detected</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Historical data shows consistent 45% increase in sales during January-March for electronics category.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Confidence:</span>
                    <div className="flex items-center gap-2">
                      <Progress value={92} className="w-20 h-2" />
                      <span className="font-medium">92%</span>
                    </div>
                  </div>
                  <Badge variant="outline">Feb-Apr Peak</Badge>
                </div>
              </div>
            </div>
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seasonalData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="sales" stroke="#4f46e5" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Risk Prediction */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Customer Risk Prediction
              </CardTitle>
              <CardDescription>AI-powered credit risk assessment</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Digital Services LLC', risk: 78, probability: 45, factors: ['Payment delays', 'High exposure', 'Credit limit'] },
              { name: 'Global Trading', risk: 72, probability: 38, factors: ['Multiple late payments', 'Increasing debt'] },
              { name: 'Office Supplies Co.', risk: 65, probability: 32, factors: ['Seasonal patterns', 'Market volatility'] },
            ].map((customer, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{customer.name}</h4>
                    <p className="text-sm text-muted-foreground">Default probability: {customer.probability}%</p>
                  </div>
                  <Badge variant="destructive">High Risk</Badge>
                </div>
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className="font-medium">{customer.risk}/100</span>
                  </div>
                  <Progress value={customer.risk} className="h-2 [&>div]:bg-red-500" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {customer.factors.map((factor, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {factor}
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3">
                  View Recommendation
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Inventory Optimization */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-600" />
                Inventory Optimization Suggestions
              </CardTitle>
              <CardDescription>AI recommendations for optimal stock levels</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { product: 'Laptop Dell XPS 15', current: 45, suggested: 65, reason: 'High demand trend detected', savings: 2400, confidence: 87 },
              { product: 'AirPods Pro', current: 156, suggested: 200, reason: 'Seasonal peak approaching', savings: 1800, confidence: 92 },
              { product: 'Desk Office Chair', current: 5, suggested: 25, reason: 'Below minimum threshold', savings: 3200, confidence: 95 },
            ].map((item, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.product}</h4>
                    <div className="flex gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="font-medium">{item.current} units</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Suggested: </span>
                        <span className="font-medium text-indigo-600">{item.suggested} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">+{item.suggested - item.current} units</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{item.reason}</p>
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    Potential savings: ${item.savings.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Confidence:</span>
                    <span className="font-medium">{item.confidence}%</span>
                  </div>
                </div>
                <Button className="w-full mt-3">Apply Suggestion</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Optimization */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Price Optimization Suggestions
              </CardTitle>
              <CardDescription>AI-powered pricing recommendations</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { product: 'iPhone 15 Pro', current: 1199, suggested: 1249, impact: '+8.2%', confidence: 84 },
              { product: 'Samsung Galaxy S24', current: 999, suggested: 949, impact: '+12.5%', confidence: 79 },
              { product: 'MacBook Pro 16"', current: 2799, suggested: 2899, impact: '+5.1%', confidence: 88 },
            ].map((item, index) => (
              <div key={index} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.product}</h4>
                    <div className="flex gap-4 mt-2">
                      <div>
                        <span className="text-sm text-muted-foreground">Current: </span>
                        <span className="font-semibold">${item.current}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Suggested: </span>
                        <span className="font-semibold text-indigo-600">${item.suggested}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={item.current < item.suggested ? 'default' : 'secondary'}>
                    {item.impact} margin
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">AI Confidence:</span>
                  <Progress value={item.confidence} className="flex-1 h-2" />
                  <span className="font-medium">{item.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                Anomaly Detection
              </CardTitle>
              <CardDescription>Unusual patterns detected by AI</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Unusual Purchase Volume Detected</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Purchase volume for "Webcam HD Pro" increased by 340% compared to historical average.
                  </p>
                  <Badge variant="outline">Detected on Feb 9, 2026</Badge>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🚨</span>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">Abnormal Sales Drop</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sales for "LG OLED TV 55"" dropped by 62% in the last week. Possible competitor activity detected.
                  </p>
                  <Badge variant="outline">Detected on Feb 8, 2026</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chat with AI */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
                Chat with AI Assistant
              </CardTitle>
              <CardDescription>Ask questions and get personalized business insights</CardDescription>
            </div>
            <Badge className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
              AI Powered
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Chat History */}
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4 p-4 rounded-lg bg-muted/30">
            {chatHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`flex gap-3 ${msg.role === 'manager' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-violet-600">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg p-4 ${
                  msg.role === 'ai' 
                    ? 'bg-white dark:bg-slate-800 border' 
                    : 'bg-indigo-600 text-white'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-2 ${
                    msg.role === 'ai' 
                      ? 'text-muted-foreground' 
                      : 'text-indigo-100'
                  }`}>
                    {msg.time}
                  </p>
                </div>
                {msg.role === 'manager' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900">
                    <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your question here..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Quick Questions */}
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Quick questions:</p>
            <div className="flex flex-wrap gap-2">
              {[
                'Analyze sales trends',
                'Predict inventory needs',
                'Identify at-risk customers',
                'Optimize pricing strategy'
              ].map((question, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setMessage(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}