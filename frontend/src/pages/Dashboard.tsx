import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  FolderGit2,
  TrendingUp,
  BrainCircuit,
  Database,
  ArrowRight,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';
import { apiClient } from '../api/client';
import { DashboardMetrics } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { StatCard } from '../components/ui/StatCard';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getOverview();
      setMetrics(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  if (loading) {
    return (
      <PageContainer title="Executive Dashboard" subtitle="Real-time complaint mining, theme analytics, and issue alerts">
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium">Loading analytical dashboard...</p>
        </div>
      </PageContainer>
    );
  }

  const isEmpty = !metrics || metrics.total_complaints === 0;

  return (
    <PageContainer
      title="Executive Dashboard"
      subtitle="Intelligent complaint surveillance, theme discovery, and prioritized root-cause alerts"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchOverview} icon={<TrendingUp className="w-4 h-4" />}>
            Refresh Analytics
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/analyzer')} icon={<BrainCircuit className="w-4 h-4" />}>
            AI Complaint Analyzer
          </Button>
        </div>
      }
    >
      {error && (
        <Alert type="error" title="Data Synchronization Notice" className="mb-6">
          {error}
        </Alert>
      )}

      {isEmpty ? (
        <Card className="text-center py-16 px-6">
          <div className="w-16 h-16 rounded-2xl bg-sky-950/60 text-sky-400 border border-sky-800/60 flex items-center justify-center mx-auto mb-4 shadow-[0_0_25px_rgba(14,165,233,0.25)]">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-100 mb-2">No Complaints Loaded Yet</h3>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mb-6">
            Import the project dataset (<code className="text-sky-300 bg-sky-950/70 border border-sky-800/50 px-1.5 py-0.5 rounded font-mono">complaints.csv</code>)
            or the curated narrative benchmark to populate the classifiers, discovery engine, and intelligence dashboards.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="primary" onClick={() => navigate('/datasets')} icon={<Database className="w-4 h-4" />}>
              Go to Data Management & Import
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Complaints"
              value={metrics.total_complaints.toLocaleString()}
              subtitle={`${metrics.labeled_complaints.toLocaleString()} labeled for ML`}
              icon={<FileText className="w-5 h-5" />}
              color="sky"
              onClick={() => navigate('/complaints')}
            />
            <StatCard
              title="Emerging Issue Alerts"
              value={metrics.emerging_issues_count}
              subtitle="Categories spiking over baseline"
              icon={<AlertTriangle className="w-5 h-5" />}
              color="amber"
              onClick={() => navigate('/issue-intelligence')}
            />
            <StatCard
              title="Active Investigations"
              value={metrics.active_investigations_count}
              subtitle="Assigned root-cause cases"
              icon={<FolderGit2 className="w-5 h-5" />}
              color="emerald"
              onClick={() => navigate('/investigations')}
            />
            <StatCard
              title="Human Review Queue"
              value={metrics.unreviewed_count}
              subtitle={`${metrics.uncertain_predictions_count} flagged as uncertain`}
              icon={<BrainCircuit className="w-5 h-5" />}
              color="purple"
              onClick={() => navigate('/complaints?review_status=unreviewed')}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown Bar Chart */}
            <Card
              title="Complaint Volume by Category"
              subtitle="Class frequency distribution from ingested complaint records"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/complaints')}>
                  View Records
                </Button>
              }
            >
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.category_distribution} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.6} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 11, fill: '#cbd5e1' }}
                      width={120}
                      stroke="#475569"
                      tickFormatter={(val) => (val.length > 18 ? val.substring(0, 18) + '...' : val)}
                    />
                    <Tooltip
                      formatter={(val: number) => [`${val.toLocaleString()} complaints`, 'Volume']}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#38bdf8' }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Monthly Trend Area Chart */}
            <Card
              title="Temporal Complaint Trends"
              subtitle="Aggregated volume over time periods"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/issue-intelligence')}>
                  Deep Dive
                </Button>
              }
            >
              <div className="h-64 w-full">
                {metrics.monthly_trend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={metrics.monthly_trend} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                      <Tooltip
                        formatter={(val: number) => [`${val.toLocaleString()} complaints`, 'Total']}
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                        itemStyle={{ color: '#38bdf8' }}
                      />
                      <Area type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#trendGradient)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No date metadata present in currently loaded dataset.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Prioritized Issues & Recent Investigations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Priority Issues */}
            <Card
              title="Top Prioritized Complaint Categories"
              subtitle="Explainable scoring combining volume, severity, and recent growth"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/issue-intelligence')}>
                  Full Ranking <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5">Category</th>
                      <th className="py-2.5">Priority</th>
                      <th className="py-2.5">Score</th>
                      <th className="py-2.5">Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {metrics.top_priority_issues.map((issue, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 font-medium text-slate-200">{issue.category}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              issue.priority_level === 'High'
                                ? 'rose'
                                : issue.priority_level === 'Medium'
                                ? 'amber'
                                : 'slate'
                            }
                          >
                            {issue.priority_level}
                          </Badge>
                        </td>
                        <td className="py-3 font-mono font-bold text-sky-400">{issue.total_score}</td>
                        <td className="py-3 text-slate-400 font-mono">{issue.complaint_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Recent Investigations */}
            <Card
              title="Recent Root-Cause Investigations"
              subtitle="Active investigation cases and root-cause evidence"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/investigations')}>
                  Investigation Center <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              }
            >
              {metrics.recent_investigations.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recent_investigations.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => navigate('/investigations')}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-850/60 hover:bg-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <h4 className="text-xs font-semibold text-slate-200 group-hover:text-sky-300 transition-colors">{inv.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {inv.category || 'General'} • Created {inv.created_at}
                        </p>
                      </div>
                      <Badge
                        variant={
                          inv.status === 'open'
                            ? 'amber'
                            : inv.status === 'investigating'
                            ? 'sky'
                            : 'emerald'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-xs text-slate-400">
                  <p>No investigations opened yet.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/investigations')}
                  >
                    Open First Investigation
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
