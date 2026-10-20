import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Complaint, PaginatedComplaints, SimilarComplaint } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const ComplaintExplorer: React.FC = () => {
  const [data, setData] = useState<PaginatedComplaints | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [uncertainOnly, setUncertainOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  // Review modal state
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Similar complaints modal
  const [similarityComplaint, setSimilarityComplaint] = useState<Complaint | null>(null);
  const [similarItems, setSimilarItems] = useState<SimilarComplaint[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getComplaints({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        category: category || undefined,
        review_status: reviewStatus || undefined,
        severity: severity || undefined,
        is_uncertain: uncertainOnly ? true : undefined,
      });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, [page, category, reviewStatus, severity, uncertainOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchComplaints();
  };

  const handleOpenReview = (c: Complaint) => {
    setSelectedComplaint(c);
    setEditCategory(c.actual_category || c.predicted_category || '');
    setReviewNotes(c.review_notes || '');
  };

  const handleSaveReview = async () => {
    if (!selectedComplaint) return;
    try {
      setSavingReview(true);
      await apiClient.reviewComplaint(selectedComplaint.id, editCategory, reviewNotes);
      setSelectedComplaint(null);
      fetchComplaints();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingReview(false);
    }
  };

  const handleFindSimilar = async (c: Complaint) => {
    setSimilarityComplaint(c);
    setLoadingSimilar(true);
    try {
      const res = await apiClient.getSimilarComplaints(c.id, undefined, 0.4);
      setSimilarItems(res.similar_complaints);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleExportCSV = () => {
    window.open(`/api/v1/reports/complaints/csv?category=${encodeURIComponent(category)}&review_status=${encodeURIComponent(reviewStatus)}&search=${encodeURIComponent(search)}`, '_blank');
  };

  return (
    <PageContainer
      title="Complaint Explorer"
      subtitle="Searchable repository, human-in-the-loop audit queue, and similarity clustering"
      actions={
        <Button variant="outline" size="sm" onClick={handleExportCSV} icon={<FileSpreadsheet className="w-4 h-4" />}>
          Export Filtered CSV
        </Button>
      }
    >
      <Card className="mb-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search complaint text, company, or product..."
                className="w-full text-xs sm:text-sm pl-9 pr-4 py-2 border rounded-lg border-slate-300 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 border rounded-md border-slate-200 bg-white text-slate-700"
            >
              <option value="">All Categories</option>
              <option value="Credit Reporting & Repair">Credit Reporting & Repair</option>
              <option value="Debt Collection & Harassment">Debt Collection & Harassment</option>
              <option value="Account Access & Management">Account Access & Management</option>
              <option value="Fraudulent Charges & Dispute">Fraudulent Charges & Dispute</option>
              <option value="Mortgage & Loan Servicing">Mortgage & Loan Servicing</option>
              <option value="Billing & Payment Processing">Billing & Payment Processing</option>
            </select>

            <select
              value={reviewStatus}
              onChange={(e) => {
                setReviewStatus(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2.5 border rounded-md border-slate-200 bg-white text-slate-700"
            >
              <option value="">All Review Statuses</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="confirmed">Human Confirmed</option>
              <option value="corrected">Human Corrected</option>
            </select>

            <label className="flex items-center gap-1.5 text-slate-700 font-medium cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={uncertainOnly}
                onChange={(e) => {
                  setUncertainOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>Uncertain Predictions Only</span>
            </label>
          </div>
        </form>
      </Card>

      {/* Complaints Table */}
      <Card>
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium">Loading complaints...</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <p className="text-sm">No complaints found matching current filters.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-3">ID</th>
                    <th className="py-3 px-3 w-2/5">Complaint Text</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Prediction</th>
                    <th className="py-3 px-3">Review Status</th>
                    <th className="py-3 px-3">Company / Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {c.external_record_id || `#${c.id}`}
                      </td>
                      <td className="py-3 px-3">
                        <p className="line-clamp-2 text-slate-800 leading-relaxed font-sans">
                          {c.original_text}
                        </p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-800">{c.actual_category || '—'}</span>
                      </td>
                      <td className="py-3 px-3">
                        {c.predicted_category ? (
                          <div>
                            <span className="font-semibold text-slate-700">{c.predicted_category}</span>
                            {c.prediction_confidence !== undefined && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-500">
                                  {(c.prediction_confidence * 100).toFixed(0)}%
                                </span>
                                {c.is_uncertain && (
                                  <Badge variant="rose" size="sm">Uncertain</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            c.review_status === 'confirmed'
                              ? 'emerald'
                              : c.review_status === 'corrected'
                              ? 'purple'
                              : 'slate'
                          }
                          size="sm"
                        >
                          {c.review_status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        <div className="truncate max-w-[140px] font-medium text-slate-700">
                          {c.company || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.received_at ? new Date(c.received_at).toLocaleDateString() : 'No date'}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFindSimilar(c)}
                            title="Find similar complaints"
                          >
                            <Layers className="w-3.5 h-3.5 text-sky-600" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(c)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(data.page - 1) * data.page_size + 1} to{' '}
                {Math.min(data.page * data.page_size, data.total)} of {data.total.toLocaleString()} records
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  icon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <span className="font-semibold text-slate-700">
                  Page {data.page} of {data.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={data.page >= data.total_pages}
                  onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Review & Correction Modal */}
      {selectedComplaint && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedComplaint(null)}
          title={`Review Complaint Record #${selectedComplaint.id}`}
          subtitle="Human-in-the-loop category audit and correction"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-slate-500 font-semibold block mb-1 uppercase tracking-wider text-[10px]">
                Original Complaint Narrative:
              </span>
              <p className="text-slate-800 leading-relaxed text-sm whitespace-pre-wrap">
                {selectedComplaint.original_text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-600">
              <div>
                <strong>Current Category:</strong> {selectedComplaint.actual_category || 'Unspecified'}
              </div>
              <div>
                <strong>Predicted:</strong> {selectedComplaint.predicted_category || 'N/A'}{' '}
                {selectedComplaint.prediction_confidence && (
                  <span className="text-slate-400">
                    ({(selectedComplaint.prediction_confidence * 100).toFixed(0)}%)
                  </span>
                )}
              </div>
              <div>
                <strong>Company:</strong> {selectedComplaint.company || 'N/A'}
              </div>
              <div>
                <strong>Location:</strong> {selectedComplaint.location || 'N/A'}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block font-semibold text-slate-700 mb-1">
                Verified Category <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="e.g. Credit Reporting & Repair"
                className="w-full py-2 px-3 border rounded-lg border-slate-300 text-xs font-medium focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auditor Notes
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Rationale for category adjustment or root cause notes..."
                className="w-full py-2 px-3 border rounded-lg border-slate-300 text-xs focus:ring-sky-500"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button variant="ghost" onClick={() => setSelectedComplaint(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveReview}
                loading={savingReview}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Save Human Verification
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Similar Complaints Modal */}
      {similarityComplaint && (
        <Modal
          isOpen={true}
          onClose={() => setSimilarityComplaint(null)}
          title="Similar & Duplicate Complaints Detection"
          subtitle={`TF-IDF Cosine Similarity matched against Record #${similarityComplaint.id}`}
          maxWidth="4xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-lg">
              <span className="font-semibold text-sky-900 block mb-1">Query Complaint:</span>
              <p className="text-sky-800 text-xs italic">"{similarityComplaint.original_text}"</p>
            </div>

            {loadingSimilar ? (
              <div className="py-12 text-center text-slate-500">
                <div className="w-6 h-6 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs">Computing cosine similarity matrix across corpus...</p>
              </div>
            ) : similarItems.length === 0 ? (
              <p className="text-slate-400 py-6 text-center">No similar complaints found above similarity threshold.</p>
            ) : (
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {similarItems.map((item) => (
                  <div
                    key={item.complaint_id}
                    className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">#{item.complaint_id}</span>
                        {item.category && <Badge variant="slate">{item.category}</Badge>}
                        {item.is_near_duplicate && (
                          <Badge variant="rose">Potential Duplicate (Score ≥ 85%)</Badge>
                        )}
                      </div>
                      <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {(item.similarity_score * 100).toFixed(1)}% Match
                      </span>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed">{item.text}</p>
                    <div className="text-[11px] text-slate-400">
                      {item.company} • {item.received_at ? new Date(item.received_at).toLocaleDateString() : 'Undated'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
