import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Plus,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Building2,
  MapPin,
  Package,
  Clock,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { Investigation } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Alert } from '../components/ui/Alert';

export const InvestigationCenter: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);

  // Evidence Explorer state
  const [evidenceCategory, setEvidenceCategory] = useState<string>('Credit Reporting & Repair');
  const [evidenceData, setEvidenceData] = useState<any | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Credit Reporting & Repair');
  const [newDept, setNewDept] = useState('Operations');
  const [creating, setCreating] = useState(false);

  // Note state
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchInvestigations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getInvestigations(statusFilter || undefined);
      setInvestigations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvidence = async (cat: string) => {
    try {
      setLoadingEvidence(true);
      const res = await apiClient.getInvestigationEvidence(cat);
      setEvidenceData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvidence(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [statusFilter]);

  useEffect(() => {
    fetchEvidence(evidenceCategory);
  }, [evidenceCategory]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newDesc.trim()) return;
    try {
      setCreating(true);
      const created = await apiClient.createInvestigation({
        title: newTitle.trim(),
        description: newDesc.trim(),
        issue_category: newCategory,
        assigned_department: newDept,
        priority_level: 'High',
      });
      setIsCreateOpen(false);
      setNewTitle('');
      setNewDesc('');
      fetchInvestigations();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleAddNote = async () => {
    if (!selectedInvestigation || !newNoteText.trim()) return;
    try {
      setAddingNote(true);
      const note = await apiClient.addInvestigationNote(
        selectedInvestigation.id,
        newNoteText.trim(),
        'Quality Lead'
      );
      setSelectedInvestigation((prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : null
      );
      setNewNoteText('');
      fetchInvestigations();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const updated = await apiClient.updateInvestigation(id, { status } as any);
      setSelectedInvestigation((prev) => (prev && prev.id === id ? updated : prev));
      fetchInvestigations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <PageContainer
      title="Root-Cause Investigation Workspace"
      subtitle="Observational evidence exploration, cross-dimensional pattern analysis, and case tracking"
      actions={
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          icon={<Plus className="w-4 h-4" />}
        >
          New Investigation Case
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Observational Evidence Explorer */}
        <Card
          title="Root-Cause Pattern & Evidence Explorer"
          subtitle="Cross-tabulate complaint patterns across company, product, and geography"
          actions={
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Focus Category:</span>
              <select
                value={evidenceCategory}
                onChange={(e) => setEvidenceCategory(e.target.value)}
                className="text-xs rounded-xl border border-slate-700/80 py-1.5 px-3 bg-slate-900 text-slate-200 font-medium focus:outline-none focus:border-sky-500"
              >
                <option value="Credit Reporting & Repair">Credit Reporting & Repair</option>
                <option value="Debt Collection & Harassment">Debt Collection & Harassment</option>
                <option value="Account Access & Management">Account Access & Management</option>
                <option value="Fraudulent Charges & Dispute">Fraudulent Charges & Dispute</option>
                <option value="Mortgage & Loan Servicing">Mortgage & Loan Servicing</option>
                <option value="Billing & Payment Processing">Billing & Payment Processing</option>
              </select>
            </div>
          }
        >
          {loadingEvidence ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs">Exploring co-occurrence distributions...</p>
            </div>
          ) : evidenceData ? (
            <div className="space-y-4 text-xs">
              <Alert type="info">
                <strong>Observational Integrity Notice:</strong> {evidenceData.disclaimer}
              </Alert>

              {/* Contributing factors synthesized */}
              {evidenceData.possible_contributing_factors &&
                evidenceData.possible_contributing_factors.length > 0 && (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                    <span className="font-semibold block mb-1 text-slate-100">
                      Identified Co-Occurrence Signals:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-300">
                      {evidenceData.possible_contributing_factors.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Breakdown Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Product Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-2.5">
                    <Package className="w-3.5 h-3.5 text-sky-400" />
                    Product Concentrations
                  </span>
                  <div className="space-y-1.5">
                    {evidenceData.product_breakdown?.slice(0, 4).map((p: any) => (
                      <div key={p.product} className="flex justify-between py-1 border-b border-slate-850 last:border-0">
                        <span className="text-slate-400 truncate max-w-[140px]">{p.product}</span>
                        <span className="font-mono text-sky-400 font-semibold">{p.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Company Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-2.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    Company Clusters
                  </span>
                  <div className="space-y-1.5">
                    {evidenceData.company_breakdown?.slice(0, 4).map((c: any) => (
                      <div key={c.company} className="flex justify-between py-1 border-b border-slate-850 last:border-0">
                        <span className="text-slate-400 truncate max-w-[140px]">{c.company}</span>
                        <span className="font-mono text-emerald-400 font-semibold">{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Geographic Breakdown */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-2.5">
                    <MapPin className="w-3.5 h-3.5 text-purple-400" />
                    Geographic Regions
                  </span>
                  <div className="space-y-1.5">
                    {evidenceData.location_breakdown?.slice(0, 4).map((l: any) => (
                      <div key={l.location} className="flex justify-between py-1 border-b border-slate-850 last:border-0">
                        <span className="text-slate-400">{l.location}</span>
                        <span className="font-mono text-purple-400 font-semibold">{l.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Supporting Complaints Snippets */}
              {evidenceData.representative_evidence &&
                evidenceData.representative_evidence.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-300 block mb-2">
                      Representative Evidence Records:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {evidenceData.representative_evidence.slice(0, 4).map((ev: any) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed italic"
                        >
                          "{ev.text.substring(0, 180)}..."
                          <span className="block mt-1 font-sans not-italic text-[10px] text-slate-500">
                            {ev.company} • {ev.received_at || 'Undated'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          ) : null}
        </Card>

        {/* Case List & Details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Investigation Cases */}
          <div className="lg:col-span-5 space-y-4">
            <Card
              title="Investigation Cases"
              subtitle="Active problem management tickets"
              actions={
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs rounded-xl border border-slate-700/80 py-1.5 px-2.5 bg-slate-900 text-slate-200"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="mitigated">Mitigated</option>
                  <option value="closed">Closed</option>
                </select>
              }
            >
              {loading ? (
                <div className="py-8 text-center text-slate-400">Loading cases...</div>
              ) : investigations.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  <p>No investigations matching filter.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {investigations.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => setSelectedInvestigation(inv)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        selectedInvestigation?.id === inv.id
                          ? 'border-sky-500 bg-sky-950/40 shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                          : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-200">{inv.title}</span>
                        <Badge
                          variant={
                            inv.status === 'open'
                              ? 'amber'
                              : inv.status === 'investigating'
                              ? 'sky'
                              : 'emerald'
                          }
                          size="sm"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="text-slate-400 line-clamp-1">{inv.description}</p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                        <span>{inv.issue_category || 'General'}</span>
                        <span className="font-mono">{inv.notes?.length || 0} notes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column: Case Detail & Notes */}
          <div className="lg:col-span-7">
            {selectedInvestigation ? (
              <Card
                title={selectedInvestigation.title}
                subtitle={`Case #${selectedInvestigation.id} • Assigned: ${selectedInvestigation.assigned_department || 'Unassigned'}`}
                actions={
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Status:</span>
                    <select
                      value={selectedInvestigation.status}
                      onChange={(e) => handleUpdateStatus(selectedInvestigation.id, e.target.value)}
                      className="text-xs rounded-xl border border-slate-700 py-1 px-2.5 bg-slate-900 text-slate-200 font-medium focus:outline-none focus:border-sky-500"
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="mitigated">Mitigated</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                }
              >
                <div className="space-y-4 text-xs">
                  <div>
                    <h5 className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] mb-1">
                      Case Description:
                    </h5>
                    <p className="text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
                      {selectedInvestigation.description}
                    </p>
                  </div>

                  {/* Notes Thread */}
                  <div>
                    <h5 className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
                      Investigation Audit Notes ({selectedInvestigation.notes?.length || 0})
                    </h5>

                    <div className="space-y-2 mb-3 max-h-56 overflow-y-auto pr-1">
                      {selectedInvestigation.notes && selectedInvestigation.notes.length > 0 ? (
                        selectedInvestigation.notes.map((note) => (
                          <div
                            key={note.id}
                            className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 shadow-xs"
                          >
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                              <span className="font-semibold text-sky-400">{note.author}</span>
                              <span>{new Date(note.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-200 text-xs leading-relaxed">{note.note}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-center py-4">No notes recorded yet.</p>
                      )}
                    </div>

                    {/* Add Note Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Add investigation findings or operational update..."
                        className="flex-1 text-xs rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-slate-200 focus:outline-none focus:border-sky-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddNote}
                        loading={addingNote}
                        icon={<Send className="w-3.5 h-3.5" />}
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="text-center py-20 text-slate-400">
                <FolderGit2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                <p className="text-xs">Select an investigation case on the left to inspect evidence and notes.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* New Investigation Modal */}
      {isCreateOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsCreateOpen(false)}
          title="Open Root-Cause Investigation"
          subtitle="Formulate an investigation case based on analytical signals"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Case Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Surge in Disputed Debt Collection Notices from Rowland Agency"
                className="w-full py-2.5 px-3.5 border rounded-xl border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full py-2.5 px-3 border rounded-xl border-slate-700 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="Credit Reporting & Repair">Credit Reporting & Repair</option>
                  <option value="Debt Collection & Harassment">Debt Collection & Harassment</option>
                  <option value="Account Access & Management">Account Access & Management</option>
                  <option value="Fraudulent Charges & Dispute">Fraudulent Charges & Dispute</option>
                  <option value="Mortgage & Loan Servicing">Mortgage & Loan Servicing</option>
                  <option value="Billing & Payment Processing">Billing & Payment Processing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Assigned Team / Department
                </label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full py-2.5 px-3 border rounded-xl border-slate-700 bg-slate-950 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="Operations">Operations</option>
                  <option value="Compliance & Legal">Compliance & Legal</option>
                  <option value="Fraud Operations">Fraud Operations</option>
                  <option value="Credit Bureau Auditing">Credit Bureau Auditing</option>
                  <option value="Customer Support Tier 3">Customer Support Tier 3</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Investigation Description & Hypotheses <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={4}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Document observed co-occurrence patterns, affected products, and audit steps..."
                className="w-full py-2.5 px-3.5 border rounded-xl border-slate-700 bg-slate-950 text-slate-100 text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                loading={creating}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Create Investigation Case
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </PageContainer>
  );
};
