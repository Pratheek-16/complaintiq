import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './pages/Dashboard';
import { DataManagement } from './pages/DataManagement';
import { AIAnalyzer } from './pages/AIAnalyzer';
import { ComplaintExplorer } from './pages/ComplaintExplorer';
import { ThemeDiscovery } from './pages/ThemeDiscovery';
import { IssueIntelligence } from './pages/IssueIntelligence';
import { InvestigationCenter } from './pages/InvestigationCenter';
import { ModelLab } from './pages/ModelLab';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { apiClient } from './api/client';

export const App: React.FC = () => {
  const [activeModel, setActiveModel] = useState<string>('Logistic Regression (Active)');
  const [totalComplaints, setTotalComplaints] = useState<number>(0);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const overview = await apiClient.getOverview();
        setTotalComplaints(overview.total_complaints);
        const comp = await apiClient.compareModels();
        const active = comp.models.find((m) => m.is_active);
        if (active) {
          setActiveModel(`${active.model_name.replace('_', ' ')} (${active.model_version.substring(0, 15)}...)`);
        }
      } catch (err) {
        // App starting or DB not initialized yet
      }
    };
    fetchStatus();
  }, []);

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50 font-sans">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Header activeModelName={activeModel} totalComplaints={totalComplaints} />
          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/datasets" element={<DataManagement />} />
              <Route path="/analyzer" element={<AIAnalyzer />} />
              <Route path="/complaints" element={<ComplaintExplorer />} />
              <Route path="/topics" element={<ThemeDiscovery />} />
              <Route path="/issue-intelligence" element={<IssueIntelligence />} />
              <Route path="/investigations" element={<InvestigationCenter />} />
              <Route path="/model-lab" element={<ModelLab />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
