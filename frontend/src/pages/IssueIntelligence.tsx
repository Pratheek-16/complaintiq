import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import { apiClient } from '../api/client';
import { PriorityScore, EmergingIssue } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

const CATEGORY_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const IssueIntelligence: React.FC = () => {
  const [trendData, setTrendData] = useState<any | null>(null);
  const [emergingIssues, setEmergingIssues] = useState<EmergingIssue[]>([]);
  const [priorities, setPriorities] = useState<PriorityScore[]>([]);
  const [period, setPeriod] = useState<string>('monthly');
  const [loading, setLoading] = useState(true);

  // Weight tuning modal state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [volumeWeight, setVolumeWeight] = useState(0.4);
  const [severityWeight, setSeverityWeight] = useState(0.3);
  const [growthWeight, setGrowthWeight] = useState(0.3);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [trends, emerging, prios] = await Promise.all([
        apiClient.getTrends(period, 6),
        apiClient.getEmergingIssues(0.3, 3),
        apiClient.getPriorities({
          volume: volumeWeight,
          severity: severityWeight,
          growth: growthWeight,
        }),
      ]);
      setTrendData(trends);
      setEmergingIssues(emerging);
      setPriorities(prios);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const handleApplyWeights = async () => {
    setIsWeightModalOpen(false);
    try {
      const prios = await apiClient.getPriorities({
        volume: volumeWeight,
        severity: severityWeight,
        growth: growthWeight,
      });
      setPriorities(prios);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer
      title="Issue Intelligence & Priority Engine"
      subtitle="Temporal trend detection, emerging volume spike alerts, and explainable priority scoring"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsWeightModalOpen(true)}
            icon={<Sliders className="w-4 h-4" />}
          >
            Configure Priority Weights
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/api/v1/reports/priorities/csv', '_blank')}
            icon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Export Priorities CSV
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Temporal Category Trends Chart */}
        <Card
          title="Category Volume Trends Over Time"
          subtitle="Comparative time-series progression across leading complaint categories"
          actions={
            <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition-all ${
                    period === p ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          }
        >
          <div className="h-72 w-full">
            {trendData && trendData.series.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.series} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  {trendData.categories.map((cat: string, idx: number) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No temporal date metadata detected in loaded dataset.
              </div>
            )}
          </div>
        </Card>

        {/* Emerging Issue Spikes */}
        <Card
          title="Emerging Issue Alerts"
          subtitle="Categories demonstrating statistically unusual growth compared to previous operational baseline"
        >
          {emergingIssues.length > 0 ? (
            <div className="space-y-3">
              {emergingIssues.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          alert.alert_level === 'Critical'
                            ? 'rose'
                            : alert.alert_level === 'Warning'
                            ? 'amber'
                            : 'sky'
                        }
                      >
                        {alert.alert_level} Alert
                      </Badge>
                      <h4 className="font-bold text-sm text-slate-900">{alert.category}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.trigger_rule}</p>
                    <span className="text-[11px] text-slate-400 block">
                      Window: {alert.time_window}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Recent vs Prior
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-700">
                        {alert.current_volume} vs {alert.previous_volume}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Growth
                      </span>
                      <span className="text-sm font-bold text-rose-600 font-mono">
                        +{alert.percentage_change}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              No surging categories detected above the current growth threshold.
            </p>
          )}
        </Card>

        {/* Explainable Priority Engine Table */}
        <Card
          title="Explainable Issue Priority Ranking"
          subtitle="Algorithmic ranking combining normalized volume, severity index, and recent growth rate"
        >
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Priority Level</th>
                  <th className="py-3 px-3">Total Score</th>
                  <th className="py-3 px-3">Volume Score</th>
                  <th className="py-3 px-3">Growth Score</th>
                  <th className="py-3 px-3">Severity Score</th>
                  <th className="py-3 px-3 w-1/3">Explanation Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priorities.map((p, idx) => (
                  <tr key={p.category} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{p.category}</td>
                    <td className="py-3 px-3">
                      <Badge
                        variant={
                          p.priority_level === 'High'
                            ? 'rose'
                            : p.priority_level === 'Medium'
                            ? 'amber'
                            : 'slate'
                        }
                      >
                        {p.priority_level}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 font-bold text-sky-700 font-mono">{p.total_score}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {p.normalized_volume} ({p.complaint_count})
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {p.normalized_growth} (+{p.recent_growth_rate}%)
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-mono">
                      {p.normalized_severity !== null && p.normalized_severity !== undefined
                        ? p.normalized_severity
                        : 'N/A (Absent)'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 leading-relaxed text-[11px]">
                      {p.explanation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Weight Tuning Modal */}
      {isWeightModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsWeightModalOpen(false)}
          title="Tune Explainable Priority Formula"
          subtitle="Adjust component weights for decision-support ranking"
        >
          <div className="space-y-5 text-xs">
            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-700">
                <span>Volume Weight (w_vol):</span>
                <span className="font-mono text-sky-600">{volumeWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumeWeight}
                onChange={(e) => setVolumeWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-700">
                <span>Growth Weight (w_gro):</span>
                <span className="font-mono text-sky-600">{growthWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={growthWeight}
                onChange={(e) => setGrowthWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-700">
                <span>Severity Weight (w_sev):</span>
                <span className="font-mono text-sky-600">{severityWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={severityWeight}
                onChange={(e) => setSeverityWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
              />
            </div>

            <Alert type="info">
              Weights are normalized before calculation. If severity data is absent from the dataset,
              the system automatically allocates proportional weight across volume and growth without
              fabricating dummy severity labels.
            </Alert>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setIsWeightModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApplyWeights} icon={<CheckCircle2 className="w-4 h-4" />}>
                Apply Weights
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
