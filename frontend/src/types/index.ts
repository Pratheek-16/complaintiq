export interface Complaint {
  id: number;
  external_record_id?: string;
  original_text: string;
  cleaned_text?: string;
  actual_category?: string;
  predicted_category?: string;
  prediction_confidence?: number;
  prediction_model_version?: string;
  is_uncertain: boolean;
  product?: string;
  company?: string;
  location?: string;
  department?: string;
  severity?: string;
  received_at?: string;
  review_status: 'unreviewed' | 'confirmed' | 'corrected';
  reviewed_category?: string;
  review_notes?: string;
  investigation_status: 'unassigned' | 'investigating' | 'resolved';
  created_at: string;
  updated_at: string;
}

export interface PaginatedComplaints {
  items: Complaint[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardMetrics {
  total_complaints: number;
  labeled_complaints: number;
  unlabeled_complaints: number;
  unreviewed_count: number;
  uncertain_predictions_count: number;
  active_investigations_count: number;
  emerging_issues_count: number;
  potential_duplicates_count: number;
  category_distribution: { category: string; count: number }[];
  monthly_trend: { period: string; count: number }[];
  top_priority_issues: PriorityScore[];
  recent_investigations: {
    id: number;
    title: string;
    status: string;
    priority_level: string;
    category?: string;
    created_at: string;
  }[];
}

export interface PriorityScore {
  category: string;
  total_score: number;
  priority_level: 'High' | 'Medium' | 'Low';
  normalized_volume: number;
  normalized_growth: number;
  normalized_severity?: number;
  weights_applied: Record<string, number>;
  explanation: string;
  complaint_count: number;
  recent_growth_rate: number;
  is_severity_available: boolean;
}

export interface EmergingIssue {
  category: string;
  current_volume: number;
  previous_volume: number;
  absolute_change: number;
  percentage_change: number;
  time_window: string;
  alert_level: 'Critical' | 'Warning' | 'Watch';
  trigger_rule: string;
  supporting_complaints: {
    id: number;
    text: string;
    received_at?: string;
    company?: string;
  }[];
}

export interface InfluentialTerm {
  term: string;
  weight: number;
}

export interface PredictionResult {
  predicted_category: string;
  confidence: number;
  confidence_level: 'High' | 'Medium' | 'Low';
  is_uncertain: boolean;
  model_name: string;
  model_version: string;
  influential_terms: InfluentialTerm[];
  all_class_probabilities: Record<string, number>;
}

export interface ModelMetrics {
  id: number;
  model_name: string;
  model_version: string;
  status: string;
  is_active: boolean;
  train_count: number;
  test_count: number;
  started_at: string;
  completed_at?: string;
  accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  macro_precision: number;
  macro_recall: number;
  per_class_metrics: Record<string, {
    precision: number;
    recall: number;
    f1_score: number;
    support: number;
  }>;
  confusion_matrix: {
    labels: string[];
    matrix: number[][];
  };
  vectorizer_configuration: Record<string, any>;
  duration_seconds?: number;
}

export interface ModelComparison {
  models: ModelMetrics[];
  best_model_by_macro_f1?: string;
  total_evaluated: number;
}

export interface DiscoveredTopic {
  id: number;
  topic_number: number;
  topic_name: string;
  algorithm: string;
  keywords: { term: string; weight: number }[];
  record_count: number;
  prevalence_percentage: number;
  representative_complaints: {
    complaint_id: number;
    text: string;
    category?: string;
    similarity_weight: number;
  }[];
  created_at: string;
}

export interface SimilarComplaint {
  complaint_id: number;
  text: string;
  category?: string;
  similarity_score: number;
  received_at?: string;
  company?: string;
  is_near_duplicate: boolean;
}

export interface InvestigationNote {
  id: number;
  investigation_id: number;
  author: string;
  note: string;
  created_at: string;
}

export interface Investigation {
  id: number;
  title: string;
  description: string;
  issue_category?: string;
  priority_score: number;
  priority_level: string;
  assigned_department?: string;
  status: 'open' | 'investigating' | 'mitigated' | 'closed';
  findings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  notes: InvestigationNote[];
}

export interface ColumnMapping {
  text_column: string;
  category_column?: string;
  date_column?: string;
  product_column?: string;
  company_column?: string;
  location_column?: string;
  department_column?: string;
  severity_column?: string;
  external_id_column?: string;
}

export interface ValidationReport {
  is_valid: boolean;
  total_rows_inspected: number;
  valid_rows_count: number;
  rejected_rows_count: number;
  rejection_reasons: Record<string, number>;
  column_stats: Record<string, any>;
  detected_categories: { category: string; count: number; percentage: number }[];
  date_range?: { start: string; end: string; span_days: number };
  warnings: string[];
  errors: string[];
}
