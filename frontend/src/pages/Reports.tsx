import React from 'react';
import {
  FileSpreadsheet,
  Download,
  Database,
  Cpu,
  TrendingUp,
  FolderGit2,
} from 'lucide-react';
import { PageContainer } from '../components/layout/PageContainer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const Reports: React.FC = () => {
  const exportItems = [
    {
      title: 'Complaint Records Export',
      description:
        'Download all ingested complaint records including original and cleaned text, actual categories, model predictions, review status, and metadata.',
      filename: 'complaintiq_records.csv',
      endpoint: '/api/v1/reports/complaints/csv',
      icon: <Database className="w-5 h-5 text-sky-600" />,
    },
    {
      title: 'Machine Learning Model Benchmarks',
      description:
        'Download performance comparison metrics (Accuracy, Macro-F1, Precision, Recall, Train/Test sample counts, and duration) across all candidate classifiers.',
      filename: 'complaintiq_model_metrics.csv',
      endpoint: '/api/v1/reports/models/csv',
      icon: <Cpu className="w-5 h-5 text-emerald-600" />,
    },
    {
      title: 'Priority Intelligence & Explanations',
      description:
        'Download algorithmic priority rankings across all issue categories with normalized volume, growth rate, severity index, and mathematical explanations.',
      filename: 'complaintiq_priorities.csv',
      endpoint: '/api/v1/reports/priorities/csv',
      icon: <TrendingUp className="w-5 h-5 text-amber-600" />,
    },
    {
      title: 'Root-Cause Investigation Cases',
      description:
        'Download active and completed root-cause investigation cases including department assignments, findings, priority scores, and auditor notes.',
      filename: 'complaintiq_investigations.csv',
      endpoint: '/api/v1/reports/investigations/csv',
      icon: <FolderGit2 className="w-5 h-5 text-purple-600" />,
    },
  ];

  return (
    <PageContainer
      title="Reports & Data Export Center"
      subtitle="Export reproducible analytical findings, model evaluation matrices, and prioritized audit logs in CSV format"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {exportItems.map((item, idx) => (
          <Card key={idx} className="flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 mb-3.5">
                <div className="w-11 h-11 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center flex-shrink-0 shadow-inner">
                  {item.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                  <span className="text-[10px] text-sky-400 font-mono">{item.filename}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Format: UTF-8 CSV</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => window.open(item.endpoint, '_blank')}
                icon={<Download className="w-3.5 h-3.5" />}
              >
                Download CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};
