import React, { useState, useEffect } from 'react';
import {
  Database,
  Upload,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Settings,
  RefreshCw,
  Table,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { ColumnMapping, ValidationReport } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Alert } from '../components/ui/Alert';

export const DataManagement: React.FC = () => {
  const [availableFiles, setAvailableFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    text_column: '',
  });
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [maxRows, setMaxRows] = useState<number>(5000);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setMessage(null);
      const res = await apiClient.uploadDataset(file);
      setMessage({ type: 'success', text: `Uploaded ${file.name} successfully!` });
      await loadFiles();
      if (res.preview) {
        setSelectedFile(res.preview.filename);
        setPreviewData(res.preview);
        if (res.preview.suggested_mapping) {
          setColumnMapping(res.preview.suggested_mapping);
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'File upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const files = await apiClient.getAvailableFiles();
      setAvailableFiles(files);
      const imports = await apiClient.getImports();
      setImportHistory(imports);

      // Auto-select first file if available
      if (files.length > 0 && !selectedFile) {
        // Prioritize complaints_sample_10k or sample_customer_complaints or complaints.csv
        const preferred = files.find(f => f.name === 'complaints_sample_10k.csv') ||
                          files.find(f => f.name === 'sample_customer_complaints.csv') ||
                          files[0];
        setSelectedFile(preferred.path);
        handleInspectFile(preferred.path);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Failed to list datasets.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleInspectFile = async (filePath: string) => {
    try {
      setLoading(true);
      setMessage(null);
      setValidationReport(null);
      const preview = await apiClient.previewDataset(filePath);
      setPreviewData(preview);
      if (preview.suggested_mapping) {
        setColumnMapping(preview.suggested_mapping);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Error inspecting file.' });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile || !columnMapping.text_column) {
      setMessage({ type: 'error', text: 'Please select a file and map at least the Text column.' });
      return;
    }
    try {
      setValidating(true);
      setMessage(null);
      const report = await apiClient.validateDataset(selectedFile, columnMapping, 5000);
      setValidationReport(report);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Validation failed.' });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !columnMapping.text_column) {
      setMessage({ type: 'error', text: 'Please specify the dataset and mapped text column.' });
      return;
    }
    try {
      setImporting(true);
      setMessage(null);
      const res = await apiClient.importDataset(selectedFile, columnMapping, maxRows, 0, replaceExisting);
      setMessage({
        type: 'success',
        text: `${res.message} Now go to 'Model Laboratory' in the left menu to train classifiers on this new data!`,
      });
      const imports = await apiClient.getImports();
      setImportHistory(imports);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.detail || err?.message || 'Import failed.' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageContainer
      title="Dataset Management & Ingestion"
      subtitle="Schema validation, column mapping, and reproducible complaint ingestion pipeline"
      actions={
        <Button variant="outline" size="sm" onClick={loadFiles} icon={<RefreshCw className="w-4 h-4" />}>
          Scan Files
        </Button>
      }
    >
      {message && (
        <Alert type={message.type} className="mb-6">
          {message.text}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: File Selector & Upload */}
        <div className="space-y-6">
          {/* Upload Custom CSV */}
          <Card title="Upload Custom CSV" subtitle="Add any customer complaint or review file">
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700/80 hover:border-sky-500 rounded-2xl cursor-pointer bg-slate-950/40 hover:bg-sky-950/20 transition-all text-center">
              <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
              <span className="text-xs font-semibold text-slate-200">Choose CSV from your computer</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Supports UTF-8 CSV datasets</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploading && <p className="text-[11px] text-sky-400 font-medium text-center mt-2">Uploading and inspecting CSV...</p>}
          </Card>

          <Card title="Available Datasets" subtitle="Detected in project root and data directory">
            <div className="space-y-2">
              {availableFiles.map((f) => (
                <div
                  key={f.path}
                  onClick={() => {
                    setSelectedFile(f.path);
                    handleInspectFile(f.path);
                  }}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedFile === f.path
                      ? 'border-sky-500 bg-sky-950/40 text-slate-100 font-medium shadow-[0_0_12px_rgba(14,165,233,0.15)]'
                      : 'border-slate-800 hover:border-slate-700 text-slate-300 bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm truncate max-w-[180px]">{f.name}</span>
                    {f.is_project_dataset ? (
                      <Badge variant="sky">Project File</Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">{f.size_mb} MB</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate font-mono">{f.path}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Import Controls */}
          <Card title="Ingestion Limits" subtitle="Configure row batch size for database import">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Max Rows to Ingest
                </label>
                <select
                  value={maxRows}
                  onChange={(e) => setMaxRows(Number(e.target.value))}
                  className="w-full text-xs rounded-xl border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                >
                  <option value={1000}>1,000 records (Fast test)</option>
                  <option value={5000}>5,000 records (Recommended)</option>
                  <option value={10000}>10,000 records (Substantial sample)</option>
                  <option value={25000}>25,000 records</option>
                  <option value={50000}>50,000 records</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Protects database memory and ensures rapid response times for local dev.
                </p>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs font-semibold text-slate-200">
                  <input
                    type="checkbox"
                    checked={replaceExisting}
                    onChange={(e) => setReplaceExisting(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-sky-500 mt-0.5"
                  />
                  <span>Reset / Replace database with this dataset</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6 mt-1 leading-relaxed">
                  Clears previous data so all dashboards, charts, themes, and models adapt purely to this new dataset.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={handleValidate}
                  loading={validating}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Run Schema Validation
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  loading={importing}
                  icon={<Upload className="w-4 h-4" />}
                >
                  Execute Ingestion to Database
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 2 Columns: Column Mapping & Validation Report */}
        <div className="lg:col-span-2 space-y-6">
          {previewData && (
            <Card
              title="Column Mapping Wizard"
              subtitle={`Mapping schema for: ${previewData.filename} (${previewData.available_columns?.length || 0} columns detected)`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Complaint Text Column <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={columnMapping.text_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, text_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500 font-medium"
                  >
                    <option value="">-- Select Text Column --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Category / Label Column (for Supervised ML)
                  </label>
                  <select
                    value={columnMapping.category_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, category_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- None / Unlabeled --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Date Received Column (for Trends)
                  </label>
                  <select
                    value={columnMapping.date_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, date_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- No Date Column --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Company / Vendor Column
                  </label>
                  <select
                    value={columnMapping.company_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, company_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- None --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Geographic Location Column
                  </label>
                  <select
                    value={columnMapping.location_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, location_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- None --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Severity / Priority Column
                  </label>
                  <select
                    value={columnMapping.severity_column || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, severity_column: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-700 bg-slate-950 text-slate-200 py-2.5 px-3 focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- None (Alternative scoring used) --</option>
                    {previewData.available_columns.map((c: string) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* Validation Report Card */}
          {validationReport && (
            <Card
              title="Dataset Validation Report"
              subtitle={`Sample evaluation of ${validationReport.total_rows_inspected} rows`}
              actions={
                <Badge variant={validationReport.is_valid ? 'emerald' : 'rose'}>
                  {validationReport.is_valid ? 'Schema Valid' : 'Validation Failed'}
                </Badge>
              }
            >
              <div className="space-y-4 text-xs">
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-slate-400">Valid Rows:</span>
                    <p className="text-base font-bold text-emerald-400">{validationReport.valid_rows_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Rejected Rows:</span>
                    <p className="text-base font-bold text-rose-400">{validationReport.rejected_rows_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Distinct Categories:</span>
                    <p className="text-base font-bold text-slate-200">{validationReport.detected_categories.length}</p>
                  </div>
                </div>

                {/* Warnings / Errors */}
                {validationReport.warnings.length > 0 && (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 space-y-1 shadow-[0_0_15px_rgba(245,158,11,0.08)]">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Dataset Warnings:
                    </p>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 text-slate-300">
                      {validationReport.warnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detected Categories */}
                {validationReport.detected_categories.length > 0 && (
                  <div>
                    <h5 className="font-semibold text-slate-300 mb-2">Category Balance in Sample:</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {validationReport.detected_categories.slice(0, 8).map((cat) => (
                        <div key={cat.category} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex justify-between">
                          <span className="font-medium text-slate-200 truncate max-w-[150px]">{cat.category}</span>
                          <span className="text-sky-400 font-mono">{cat.count} ({cat.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Import History Table */}
          <Card title="Historical Dataset Ingestions" subtitle="Audit log of previous dataset imports">
            {importHistory.length > 0 ? (
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-800 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">File</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Accepted</th>
                      <th className="py-2.5 px-3">Rejected</th>
                      <th className="py-2.5 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {importHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3 font-medium text-slate-200">{h.filename}</td>
                        <td className="py-3 px-3">
                          <Badge variant={h.import_status === 'completed' ? 'emerald' : 'amber'}>
                            {h.import_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{h.accepted_rows?.toLocaleString()}</td>
                        <td className="py-3 px-3 font-mono text-rose-400">{h.rejected_rows}</td>
                        <td className="py-3 px-3 text-slate-400">{new Date(h.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No previous imports recorded.</p>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
