import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Play,
  CheckCircle2,
  FileSpreadsheet,
  AlertTriangle,
  Zap,
  Layers,
  BarChart,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ModelComparison, ModelMetrics } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const ModelLab: React.FC = () => {
  const [comparison, setComparison] = useState<ModelComparison | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainingModelName, setTrainingModelName] = useState('all');
  const [testSize, setTestSize] = useState(0.25);
  const [maxFeatures, setMaxFeatures] = useState(5000);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.compareModels();
      setComparison(data);
      if (data.models.length > 0 && !selectedModel) {
        const active = data.models.find((m) => m.is_active) || data.models[0];
        setSelectedModel(active);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load model comparison.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, []);

  const handleTrain = async () => {
    try {
      setTraining(true);
      setError(null);
      setSuccessMessage(null);
      const results = await apiClient.trainModels({
        model_name: trainingModelName,
        test_size: testSize,
        ngram_range: [1, 2],
        max_features: maxFeatures,
        min_df: 1,
        stratify: true,
      });
      // Automatically activate the best model by Macro-F1
      if (results.length > 0) {
        const best = results.reduce((prev, curr) => (curr.macro_f1 > prev.macro_f1 ? curr : prev), results[0]);
        await apiClient.activateModel(best.model_version);
        setSuccessMessage(
          `Successfully trained ${results.length} model(s)! Automatically activated top-performing model: ${best.model_name.replace('_', ' ').toUpperCase()} (${(best.macro_f1 * 100).toFixed(1)}% Macro-F1) for live inference.`
        );
      }
      await fetchComparison();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Model training failed.');
    } finally {
      setTraining(false);
    }
  };

  const handleActivate = async (version: string) => {
    try {
      await apiClient.activateModel(version);
      setSuccessMessage(`Activated model version ${version} for runtime inference.`);
      fetchComparison();
    } catch (err: any) {
      setError(err?.message || 'Activation failed.');
    }
  };

  return (
    <PageContainer
      title="Model Comparison Laboratory"
      subtitle="Benchmark supervised classifiers on held-out test splits with calibrated evaluation metrics"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open('/api/v1/reports/models/csv', '_blank')}
          icon={<FileSpreadsheet className="w-4 h-4" />}
        >
          Export Evaluation CSV
        </Button>
      }
    >
      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" className="mb-6">
          {successMessage}
        </Alert>
      )}

      {/* Training Configuration Panel */}
      <Card
        title="Classifier Training & Benchmark Runner"
        subtitle="Reproducible scikit-learn training pipeline (stratified split, TF-IDF vectorization, zero data leakage)"
        className="mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Candidate Models</label>
            <select
              value={trainingModelName}
              onChange={(e) => setTrainingModelName(e.target.value)}
              className="w-full rounded-lg border-slate-300 py-2 px-3 border bg-white font-medium"
            >
              <option value="all">Compare All (Naive Bayes, LogReg, Linear SVM)</option>
              <option value="logistic_regression">Logistic Regression (Balanced L2)</option>
              <option value="naive_bayes">Multinomial Naive Bayes</option>
              <option value="linear_svm">Calibrated Linear SVM (Platt Scaling)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Holdout Test Size: {(testSize * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min={0.15}
              max={0.35}
              step={0.05}
              value={testSize}
              onChange={(e) => setTestSize(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Max TF-IDF Features: {maxFeatures.toLocaleString()}
            </label>
            <input
              type="range"
              min={1000}
              max={15000}
              step={1000}
              value={maxFeatures}
              onChange={(e) => setMaxFeatures(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
            />
          </div>

          <div>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleTrain}
              loading={training}
              icon={<Play className="w-4 h-4" />}
            >
              Train & Evaluate Pipeline
            </Button>
          </div>
        </div>
      </Card>

      {/* Model Benchmark Table */}
      <Card
        title="Model Benchmark Comparison Matrix"
        subtitle="Computed strictly on held-out test splits. Macro-F1 is primary selection metric for class balance."
        className="mb-6"
      >
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading benchmark results...</div>
        ) : !comparison || comparison.models.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Cpu className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">No trained models found. Run training above to populate comparison metrics.</p>
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-3">Model</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 font-bold text-sky-900">Macro-F1 (Primary)</th>
                  <th className="py-3 px-3">Accuracy</th>
                  <th className="py-3 px-3">Weighted-F1</th>
                  <th className="py-3 px-3">Precision / Recall</th>
                  <th className="py-3 px-3">Split (Train / Test)</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparison.models.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedModel(m)}
                    className={`cursor-pointer transition-colors ${
                      selectedModel?.id === m.id ? 'bg-sky-50/70 font-medium' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-900 block capitalize">
                        {m.model_name.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{m.model_version}</span>
                    </td>
                    <td className="py-3 px-3">
                      {m.is_active ? (
                        <Badge variant="emerald">Active Serving</Badge>
                      ) : (
                        <Badge variant="slate">Archived</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-sky-700 text-sm">
                      {(m.macro_f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {(m.accuracy * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {(m.weighted_f1 * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600">
                      {(m.macro_precision * 100).toFixed(0)}% / {(m.macro_recall * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {m.train_count} / {m.test_count}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {m.duration_seconds ? `${m.duration_seconds}s` : '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!m.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(m.model_version);
                          }}
                        >
                          Set Active
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Selected Model Deep Dive: Confusion Matrix & Per-Class Metrics */}
      {selectedModel && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Confusion Matrix */}
          <div className="lg:col-span-6">
            <Card
              title="Confusion Matrix"
              subtitle={`Held-out test set classification outcomes for: ${selectedModel.model_name}`}
            >
              {selectedModel.confusion_matrix?.matrix?.length > 0 ? (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr>
                        <th className="p-1.5 text-left text-[10px] text-slate-400 uppercase font-semibold">
                          True \ Pred
                        </th>
                        {selectedModel.confusion_matrix.labels.map((l) => (
                          <th
                            key={l}
                            className="p-1.5 text-[10px] text-slate-500 font-semibold truncate max-w-[80px]"
                            title={l}
                          >
                            {l.substring(0, 10)}...
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedModel.confusion_matrix.matrix.map((row, rIdx) => {
                        const trueLabel = selectedModel.confusion_matrix.labels[rIdx];
                        const rowTotal = row.reduce((a, b) => a + b, 0);
                        return (
                          <tr key={rIdx}>
                            <td
                              className="p-1.5 text-left font-semibold text-slate-700 truncate max-w-[120px]"
                              title={trueLabel}
                            >
                              {trueLabel.substring(0, 14)}...
                            </td>
                            {row.map((val, cIdx) => {
                              const isDiagonal = rIdx === cIdx;
                              const intensity = rowTotal > 0 ? Math.round((val / rowTotal) * 100) : 0;
                              return (
                                <td
                                  key={cIdx}
                                  className={`p-2 border font-mono font-medium ${
                                    isDiagonal
                                      ? 'bg-sky-100 text-sky-900 border-sky-200 font-bold'
                                      : val > 0
                                      ? 'bg-rose-50 text-rose-800 border-rose-100'
                                      : 'bg-white text-slate-300 border-slate-100'
                                  }`}
                                  title={`True: ${trueLabel}, Predicted: ${selectedModel.confusion_matrix.labels[cIdx]}`}
                                >
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No matrix data available.</p>
              )}
            </Card>
          </div>

          {/* Per-Class Metrics */}
          <div className="lg:col-span-6">
            <Card
              title="Per-Class Performance Metrics"
              subtitle="Precision, Recall, and F1-Score calculated across individual categories"
            >
              {selectedModel.per_class_metrics &&
              Object.keys(selectedModel.per_class_metrics).length > 0 ? (
                <div className="overflow-x-auto text-xs">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5">Category</th>
                        <th className="py-2.5">Precision</th>
                        <th className="py-2.5">Recall</th>
                        <th className="py-2.5 font-bold text-sky-900">F1-Score</th>
                        <th className="py-2.5">Support</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {Object.entries(selectedModel.per_class_metrics).map(([cat, metrics]) => (
                        <tr key={cat} className="hover:bg-slate-50">
                          <td className="py-2.5 font-sans font-medium text-slate-800">{cat}</td>
                          <td className="py-2.5 text-slate-600">{(metrics.precision * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-slate-600">{(metrics.recall * 100).toFixed(1)}%</td>
                          <td className="py-2.5 font-bold text-sky-700">{(metrics.f1_score * 100).toFixed(1)}%</td>
                          <td className="py-2.5 text-slate-400 font-sans">{metrics.support}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-6 text-center">No per-class breakdown available.</p>
              )}
            </Card>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
