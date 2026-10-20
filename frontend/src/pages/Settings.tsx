import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  CheckCircle2,
  Database,
  Sliders,
  Shield,
  Info,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const Settings: React.FC = () => {
  const [similarityThreshold, setSimilarityThreshold] = useState(0.60);
  const [growthThreshold, setGrowthThreshold] = useState(0.40);
  const [uncertaintyThreshold, setUncertaintyThreshold] = useState(0.55);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = () => {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <PageContainer
      title="System Settings & Analytical Thresholds"
      subtitle="Configure sensitivity parameters, similarity thresholds, and explainable scoring defaults"
    >
      {savedMessage && (
        <Alert type="success" className="mb-6">
          Analytical settings saved successfully. Thresholds will apply to subsequent queries.
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* ML & Classification Settings */}
        <Card title="Classification & Confidence Calibration" subtitle="Configure uncertainty and inference bounds">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Prediction Uncertainty Threshold:</span>
                <span className="font-mono text-sky-400">{(uncertaintyThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.30}
                max={0.80}
                step={0.05}
                value={uncertaintyThreshold}
                onChange={(e) => setUncertaintyThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Predictions below this confidence level are flagged for human-in-the-loop audit.
              </p>
            </div>

            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Duplicate Similarity Match Threshold:</span>
                <span className="font-mono text-sky-400">{(similarityThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.40}
                max={0.90}
                step={0.05}
                value={similarityThreshold}
                onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Cosine similarity threshold for matching similar and near-duplicate complaints.
              </p>
            </div>
          </div>
        </Card>

        {/* Temporal & Emerging Issue Settings */}
        <Card title="Temporal Surveillance & Spike Detection" subtitle="Define anomaly sensitivity for emerging complaints">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1.5 font-semibold text-slate-300">
                <span>Emerging Issue Surge Growth Threshold:</span>
                <span className="font-mono text-sky-400">{(growthThreshold * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.20}
                max={1.00}
                step={0.05}
                value={growthThreshold}
                onChange={(e) => setGrowthThreshold(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg accent-sky-500 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Volume increase percentage compared to historical baseline required to trigger an emerging alert.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl">
              <span className="font-semibold text-slate-300 block mb-1">Zero-Volume Baseline Handling:</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                When an issue had 0 volume in the prior period and appears in the recent period, it is classified as a
                "New Emerging Surge" rather than triggering mathematical division-by-zero errors.
              </p>
            </div>
          </div>
        </Card>

        {/* Architecture & Environment */}
        <Card title="Environment & Persistence" subtitle="Current runtime configuration" className="md:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Database</span>
              <span className="text-sm font-bold text-slate-200">SQLite / PostgreSQL ORM</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">SQLAlchemy 2.0 Engine</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">NLP & ML Core</span>
              <span className="text-sm font-bold text-slate-200">Scikit-Learn 1.9 + SciPy</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">TF-IDF + Naive Bayes / LogReg / SVM</span>
            </div>
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-slate-500 text-[10px] uppercase font-semibold block">Frontend Architecture</span>
              <span className="text-sm font-bold text-slate-200">React 18 + Vite + Tailwind</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">Recharts + Lucide Icons</span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/80 flex justify-end">
            <Button variant="primary" onClick={handleSave} icon={<CheckCircle2 className="w-4 h-4" />}>
              Save Preferences
            </Button>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
};
