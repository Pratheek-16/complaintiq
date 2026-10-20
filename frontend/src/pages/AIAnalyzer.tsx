import React, { useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  HelpCircle,
  BarChart2,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { PredictionResult } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

const SAMPLE_COMPLAINTS = [
  {
    title: 'Credit Report Inaccuracy',
    text: 'I submitted written dispute documents showing I never opened this account, but the bureau refused to remove it and my score dropped 80 points.',
  },
  {
    title: 'Debt Collection Harassment',
    text: 'A debt collector has been repeatedly calling my workplace and cell phone after I sent a cease and desist letter. They threatened arrest and wage garnishment.',
  },
  {
    title: 'Unauthorized Debit Fraud',
    text: 'An unauthorized charge of $1,250 appeared on my checking account from an overseas merchant. Bank denied my fraud dispute citing chip verification.',
  },
  {
    title: 'Mortgage Escrow Error',
    text: 'Mortgage servicer failed to pay property taxes from my escrow account on time, resulting in local county tax penalties and a lien notice.',
  },
];

export const AIAnalyzer: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [uncertaintyThreshold, setUncertaintyThreshold] = useState<number>(0.55);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [selectedCorrection, setSelectedCorrection] = useState<string>('');

  const handleAnalyze = async (textToAnalyze?: string) => {
    const text = textToAnalyze || inputText;
    if (!text.trim()) {
      setError('Please provide complaint text to classify.');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      setReviewMessage(null);
      const res = await apiClient.predictComplaint(text, uncertaintyThreshold);
      setPrediction(res);
      setSelectedCorrection(res.predicted_category);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Inference failed. Ensure at least one classifier is trained in the Model Laboratory.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmOrCorrect = (isCorrect: boolean) => {
    if (!prediction) return;
    const finalCategory = isCorrect ? prediction.predicted_category : selectedCorrection;
    setReviewMessage(
      `Recorded human feedback: Category "${finalCategory}" verified for future retraining cycles.`
    );
  };

  return (
    <PageContainer
      title="AI Complaint Analyzer"
      subtitle="Real-time multi-class classification, calibrated probability, and influential feature explanation"
    >
      {error && (
        <Alert type="error" title="Inference Notice" className="mb-6">
          {error}
        </Alert>
      )}

      {reviewMessage && (
        <Alert type="success" className="mb-6">
          {reviewMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Complaint Input */}
        <div className="lg:col-span-7 space-y-4">
          <Card
            title="Complaint Text Input"
            subtitle="Paste customer narrative or support ticket description"
          >
            <div className="space-y-4">
              <textarea
                rows={6}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter customer complaint narrative here... (e.g. 'I was charged double for a recurring subscription and customer support refused to issue a refund...')"
                className="w-full text-xs sm:text-sm rounded-lg border-slate-300 shadow-xs focus:ring-sky-500 focus:border-sky-500 p-3.5 border font-sans text-slate-800"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Confidence Threshold:</span>
                  <select
                    value={uncertaintyThreshold}
                    onChange={(e) => setUncertaintyThreshold(Number(e.target.value))}
                    className="text-xs rounded border-slate-300 py-1 px-2 border bg-white"
                  >
                    <option value={0.45}>45% (Permissive)</option>
                    <option value={0.55}>55% (Standard)</option>
                    <option value={0.70}>70% (Strict)</option>
                  </select>
                </div>

                <Button
                  variant="primary"
                  onClick={() => handleAnalyze()}
                  loading={analyzing}
                  icon={<BrainCircuit className="w-4 h-4" />}
                >
                  Classify Complaint
                </Button>
              </div>
            </div>
          </Card>

          {/* Preset Prompts */}
          <Card title="Quick Test Presets" subtitle="Select a sample complaint to test classifier response">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_COMPLAINTS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(sample.text);
                    handleAnalyze(sample.text);
                  }}
                  className="p-3 text-left rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition-all group"
                >
                  <p className="text-xs font-semibold text-slate-800 group-hover:text-sky-700">
                    {sample.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-1">{sample.text}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Model Output & Explanation */}
        <div className="lg:col-span-5 space-y-4">
          {prediction ? (
            <div className="space-y-4">
              {/* Classification Outcome Card */}
              <Card
                title="Model Classification Result"
                subtitle={`Inference served by ${prediction.model_name} (${prediction.model_version})`}
              >
                <div className="space-y-4">
                  {/* Category Banner */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Predicted Category
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">
                      {prediction.predicted_category}
                    </h3>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-600">Decision Strength:</span>
                        <span className="text-sm font-bold text-sky-700 font-mono">
                          {(prediction.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Badge
                        variant={
                          prediction.confidence_level === 'High'
                            ? 'emerald'
                            : prediction.confidence_level === 'Medium'
                            ? 'amber'
                            : 'rose'
                        }
                      >
                        {prediction.confidence_level} Confidence
                      </Badge>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          prediction.confidence_level === 'High'
                            ? 'bg-emerald-500'
                            : prediction.confidence_level === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, prediction.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Uncertainty Warning if applicable */}
                  {prediction.is_uncertain && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Flagged for Human Review</strong>
                        Confidence score is below configured threshold (
                        {(uncertaintyThreshold * 100).toFixed(0)}%). Expert confirmation recommended.
                      </div>
                    </div>
                  )}

                  {/* Top Influential Terms */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Key Influential Features (N-Grams)
                    </h5>
                    {prediction.influential_terms.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {prediction.influential_terms.map((term, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-sky-50 text-sky-800 border border-sky-200 font-mono"
                          >
                            <span>{term.term}</span>
                            <span className="text-[10px] text-sky-500 font-semibold">
                              +{term.weight.toFixed(2)}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No single dominant term detected.</p>
                    )}
                  </div>

                  {/* All Class Probabilities */}
                  <div>
                    <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Class Probability Distribution
                    </h5>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {Object.entries(prediction.all_class_probabilities)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, prob]) => (
                          <div key={cat} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-50">
                            <span className="text-slate-700 truncate max-w-[200px]">{cat}</span>
                            <span className="font-mono text-slate-600 font-medium">
                              {(prob * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Human-in-the-Loop Feedback Section */}
                  <div className="pt-3 border-t border-slate-100">
                    <span className="text-xs font-semibold text-slate-700 block mb-2">
                      Human Review Verification:
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfirmOrCorrect(true)}
                        icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        Confirm Predicted
                      </Button>
                      <select
                        value={selectedCorrection}
                        onChange={(e) => setSelectedCorrection(e.target.value)}
                        className="text-xs rounded border-slate-300 py-1.5 px-2 border bg-white flex-1"
                      >
                        {Object.keys(prediction.all_class_probabilities).map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleConfirmOrCorrect(false)}
                      >
                        Correct
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">Awaiting Input Text</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Enter complaint text or choose a preset prompt to generate category prediction and feature weights.
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
