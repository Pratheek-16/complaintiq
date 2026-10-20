import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Cpu,
  BarChart2,
  Info,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { DiscoveredTopic } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const ThemeDiscovery: React.FC = () => {
  const [topics, setTopics] = useState<DiscoveredTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [algorithm, setAlgorithm] = useState('nmf');
  const [numTopics, setNumTopics] = useState(5);
  const [numKeywords, setNumKeywords] = useState(8);
  const [error, setError] = useState<string | null>(null);

  // Rename modal
  const [editingTopic, setEditingTopic] = useState<DiscoveredTopic | null>(null);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTopics();
      setTopics(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load discovered topics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleRunDiscovery = async () => {
    try {
      setDiscovering(true);
      setError(null);
      const res = await apiClient.discoverTopics({
        algorithm,
        num_topics: numTopics,
        num_keywords: numKeywords,
        max_features: 4000,
      });
      setTopics(res.topics);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Topic discovery failed.');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSaveRename = async () => {
    if (!editingTopic || !newName.trim()) return;
    try {
      setSavingName(true);
      const updated = await apiClient.renameTopic(editingTopic.id, newName.trim());
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setEditingTopic(null);
    } catch (err: any) {
      setError(err?.message || 'Rename failed.');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <PageContainer
      title="Unsupervised Theme Discovery"
      subtitle="Discover latent complaint patterns and recurring themes beyond predefined category labels"
    >
      {/* Alert Context */}
      <Alert type="info" className="mb-6">
        <strong>Methodological Note:</strong> Discovered topics represent statistical co-occurrence
        clusters extracted by matrix decomposition (NMF) or generative mixture models (LDA). Topics
        highlight recurring symptom clusters and operational patterns, not verified root causes.
      </Alert>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Control Panel Card */}
      <Card title="Topic Discovery Configuration" subtitle="Configure unsupervised learning parameters" className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              className="w-full text-xs rounded-lg border-slate-300 py-2 px-3 border bg-white"
            >
              <option value="nmf">NMF (Non-negative Matrix Factorization)</option>
              <option value="lda">LDA (Latent Dirichlet Allocation)</option>
              <option value="kmeans">K-Means Document Clustering</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Number of Themes: {numTopics}</label>
            <input
              type="range"
              min={3}
              max={12}
              value={numTopics}
              onChange={(e) => setNumTopics(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keywords per Theme: {numKeywords}</label>
            <input
              type="range"
              min={5}
              max={15}
              value={numKeywords}
              onChange={(e) => setNumKeywords(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg accent-sky-600"
            />
          </div>

          <div>
            <Button
              variant="primary"
              className="w-full"
              onClick={handleRunDiscovery}
              loading={discovering}
              icon={<Sparkles className="w-4 h-4" />}
            >
              Discover Themes
            </Button>
          </div>
        </div>
      </Card>

      {/* Discovered Themes Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-medium">Loading discovered themes...</p>
        </div>
      ) : topics.length === 0 ? (
        <Card className="text-center py-16 px-4">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800">No Themes Discovered Yet</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Run NMF or LDA topic discovery on your imported complaint dataset to reveal recurring customer complaint patterns.
          </p>
          <Button variant="primary" size="sm" onClick={handleRunDiscovery} loading={discovering}>
            Run Theme Discovery Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topics.map((topic) => (
            <Card key={topic.id} className="flex flex-col justify-between">
              <div>
                {/* Header with Title and Edit */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                      Topic #{topic.topic_number} • {topic.algorithm.toUpperCase()}
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                      {topic.topic_name}
                      <button
                        onClick={() => {
                          setEditingTopic(topic);
                          setNewName(topic.topic_name);
                        }}
                        className="text-slate-400 hover:text-sky-600 transition-colors"
                        title="Rename topic"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-slate-800 font-mono">
                      {topic.prevalence_percentage}%
                    </span>
                    <span className="text-[11px] text-slate-400 block -mt-0.5">
                      {topic.record_count} complaints
                    </span>
                  </div>
                </div>

                {/* Prevalence Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, topic.prevalence_percentage * 2)}%` }}
                  />
                </div>

                {/* Keywords Cloud */}
                <div className="mb-4">
                  <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Distinguishing Keywords:
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {topic.keywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded text-xs text-slate-700 border border-slate-200 font-mono"
                      >
                        <span>{kw.term}</span>
                        <span className="text-[10px] text-slate-400">({kw.weight})</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Representative Complaints Excerpts */}
                {topic.representative_complaints && topic.representative_complaints.length > 0 && (
                  <div>
                    <h5 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Representative Evidence:
                    </h5>
                    <div className="space-y-2">
                      {topic.representative_complaints.slice(0, 2).map((rep) => (
                        <div
                          key={rep.complaint_id}
                          className="p-2.5 rounded bg-slate-50/70 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed italic"
                        >
                          "{rep.text}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Topic Modal */}
      {editingTopic && (
        <Modal
          isOpen={true}
          onClose={() => setEditingTopic(null)}
          title={`Rename Topic #${editingTopic.topic_number}`}
          subtitle="Assign an informative business label based on observed keywords"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                New Topic Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Identity Theft & Unauthorized Account Inquiries"
                className="w-full py-2 px-3 border rounded-lg border-slate-300 text-xs font-medium focus:ring-sky-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setEditingTopic(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveRename}
                loading={savingName}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Save Name
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
