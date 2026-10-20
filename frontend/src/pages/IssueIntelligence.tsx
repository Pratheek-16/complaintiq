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
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    period === p
                      ? 'bg-sky-950 text-sky-300 border border-sky-800/60 shadow-xs font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#475569" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: '#cbd5e1' }} />
                  {trendData.categories.map((cat: string, idx: number) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      stroke={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                      strokeWidth={2.5}
                      dot={{ r: 3.5, strokeWidth: 1 }}
                      activeDot={{ r: 6 }}
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
                  className="p-4.5 rounded-xl border border-amber-800/60 bg-amber-950/20 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_0_15px_rgba(245,158,11,0.06)]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
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
                      <h4 className="font-bold text-sm text-slate-100">{alert.category}</h4>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{alert.trigger_rule}</p>
                    <span className="text-[11px] text-slate-500 block">
                      Evaluation Window: {alert.time_window}
                    </span>
                  </div>

                  <div className="flex items-center gap-5 text-right flex-shrink-0">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                        Recent vs Prior
                      </span>
                      <span className="text-xs font-mono font-medium text-slate-200">
                        {alert.current_volume} vs {alert.previous_volume}
                      </span>
                    </div>
                    <div className="bg-rose-950/50 border border-rose-800/60 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-rose-300 uppercase tracking-wider block font-semibold">
                        Growth
                      </span>
                      <span className="text-sm font-bold text-rose-400 font-mono">
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
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
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
              <tbody className="divide-y divide-slate-800/60">
                {priorities.map((p, idx) => (
                  <tr key={p.category} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-bold font-mono text-slate-500">#{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-200">{p.category}</td>
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
                    <td className="py-3 px-3 font-bold text-sky-400 font-mono">{p.total_score}</td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {p.normalized_volume} ({p.complaint_count})
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      {p.normalized_growth} (+{p.recent_growth_rate}%)
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {p.normalized_severity !== null && p.normalized_severity !== undefined
                        ? p.normalized_severity
                        : 'N/A (Absent)'}
                    </td>
                    <td className="py-3 px-3 text-slate-400 leading-relaxed text-[11px]">
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
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Volume Weight (w_vol):</span>
                <span className="font-mono text-sky-400">{volumeWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volumeWeight}
                onChange={(e) => setVolumeWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Growth Weight (w_gro):</span>
                <span className="font-mono text-sky-400">{growthWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={growthWeight}
                onChange={(e) => setGrowthWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Severity Weight (w_sev):</span>
                <span className="font-mono text-sky-400">{severityWeight}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={severityWeight}
                onChange={(e) => setSeverityWeight(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
            </div>

            <Alert type="info">
              Weights are normalized before calculation. If severity data is absent from the dataset,
              the system automatically allocates proportional weight across volume and growth without
              fabricating dummy severity labels.
            </Alert>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
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
