import axios from 'axios';
import {
  Complaint,
  PaginatedComplaints,
  DashboardMetrics,
  PriorityScore,
  EmergingIssue,
  PredictionResult,
  ModelComparison,
  ModelMetrics,
  DiscoveredTopic,
  SimilarComplaint,
  Investigation,
  ColumnMapping,
  ValidationReport,
} from '../types';

const apiBase = import.meta.env.VITE_API_BASE_URL
  ? `${import.meta.env.VITE_API_BASE_URL}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Datasets
  getAvailableFiles: async () => {
    const res = await api.get('/datasets/available-files');
    return res.data.available_files as { name: string; location: string; path: string; size_mb: number; is_project_dataset: boolean }[];
  },
  previewDataset: async (filePath: string) => {
    const res = await api.get('/datasets/preview', { params: { file_path: filePath } });
    return res.data;
  },
  validateDataset: async (filePath: string, mapping: ColumnMapping, sampleSize: number = 5000) => {
    const res = await api.post('/datasets/validate', mapping, {
      params: { file_path: filePath, sample_size: sampleSize },
    });
    return res.data as ValidationReport;
  },
  uploadDataset: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  importDataset: async (filePath: string, mapping: ColumnMapping, maxRows?: number, offsetRows: number = 0, replaceExisting: boolean = false) => {
    const res = await api.post('/datasets/import', {
      filename: filePath,
      column_mapping: mapping,
      max_rows: maxRows,
      offset_rows: offsetRows,
      replace_existing: replaceExisting,
    });
    return res.data;
  },
  getImports: async () => {
    const res = await api.get('/datasets/imports');
    return res.data;
  },

  // Complaints
  getComplaints: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    review_status?: string;
    severity?: string;
    is_uncertain?: boolean;
    product?: string;
    company?: string;
  }) => {
    const res = await api.get<PaginatedComplaints>('/complaints', { params });
    return res.data;
  },
  getComplaint: async (id: number) => {
    const res = await api.get<Complaint>(`/complaints/${id}`);
    return res.data;
  },
  reviewComplaint: async (id: number, reviewedCategory: string, notes?: string, invStatus?: string) => {
    const res = await api.patch<Complaint>(`/complaints/${id}/review`, {
      reviewed_category: reviewedCategory,
      review_notes: notes,
      investigation_status: invStatus,
    });
    return res.data;
  },

  // Machine Learning
  trainModels: async (config: {
    model_name: string;
    test_size: number;
    ngram_range: [number, number];
    max_features: number;
    min_df: number;
    stratify: boolean;
  }) => {
    const res = await api.post<ModelMetrics[]>('/models/train', config);
    return res.data;
  },
  compareModels: async () => {
    const res = await api.get<ModelComparison>('/models/compare');
    return res.data;
  },
  predictComplaint: async (text: string, uncertaintyThreshold: number = 0.55, modelVersion?: string) => {
    const res = await api.post<PredictionResult>('/models/predict', {
      text,
      uncertainty_threshold: uncertaintyThreshold,
      model_version: modelVersion,
    });
    return res.data;
  },
  activateModel: async (version: string) => {
    const res = await api.post(`/models/${version}/activate`);
    return res.data;
  },

  // Topics
  discoverTopics: async (config: {
    algorithm: string;
    num_topics: number;
    num_keywords: number;
    max_features: number;
  }) => {
    const res = await api.post('/topics/discover', config);
    return res.data;
  },
  getTopics: async () => {
    const res = await api.get<DiscoveredTopic[]>('/topics');
    return res.data;
  },
  renameTopic: async (id: number, newName: string) => {
    const res = await api.patch<DiscoveredTopic>(`/topics/${id}/rename`, { topic_name: newName });
    return res.data;
  },

  // Analytics
  getOverview: async () => {
    const res = await api.get<DashboardMetrics>('/analytics/overview');
    return res.data;
  },
  getTrends: async (period: string = 'monthly', topN: number = 6) => {
    const res = await api.get('/analytics/trends', { params: { period, top_n: topN } });
    return res.data;
  },
  getEmergingIssues: async (growthThreshold: number = 0.4, minVolume: number = 5) => {
    const res = await api.get<EmergingIssue[]>('/analytics/emerging-issues', {
      params: { growth_threshold: growthThreshold, min_volume: minVolume },
    });
    return res.data;
  },
  getPriorities: async (weights?: { volume?: number; severity?: number; growth?: number }) => {
    const res = await api.get<PriorityScore[]>('/analytics/priorities', {
      params: {
        volume_weight: weights?.volume,
        severity_weight: weights?.severity,
        growth_weight: weights?.growth,
      },
    });
    return res.data;
  },
  getSimilarComplaints: async (complaintId?: number, queryText?: string, threshold: number = 0.6) => {
    const res = await api.get('/analytics/similar', {
      params: { complaint_id: complaintId, query_text: queryText, threshold },
    });
    return res.data as {
      query_complaint_id?: number;
      query_text: string;
      similarity_threshold: number;
      similar_complaints: SimilarComplaint[];
      total_found: number;
    };
  },

  // Investigations
  getInvestigations: async (status?: string) => {
    const res = await api.get<Investigation[]>('/investigations', { params: { status } });
    return res.data;
  },
  createInvestigation: async (data: {
    title: string;
    description: string;
    issue_category?: string;
    priority_score?: number;
    priority_level?: string;
    assigned_department?: string;
  }) => {
    const res = await api.post<Investigation>('/investigations', data);
    return res.data;
  },
  getInvestigationEvidence: async (category: string) => {
    const res = await api.get('/investigations/evidence', { params: { category } });
    return res.data;
  },
  updateInvestigation: async (id: number, data: Partial<Investigation>) => {
    const res = await api.patch<Investigation>(`/investigations/${id}`, data);
    return res.data;
  },
  addInvestigationNote: async (id: number, note: string, author: string = 'Analyst') => {
    const res = await api.post(`/investigations/${id}/notes`, { note, author });
    return res.data;
  },
};
