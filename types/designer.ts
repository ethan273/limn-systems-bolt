// Designer Management System Types

export interface Designer {
  id: string;
  name: string;
  company_name?: string;
  contact_email: string;
  phone?: string;
  website?: string;
  portfolio_url?: string;
  specialties: string[];
  design_style: string[];
  hourly_rate?: number;
  currency: string;
  status: 'prospect' | 'active' | 'preferred' | 'on_hold' | 'inactive';
  rating?: number;
  years_experience?: number;
  certifications: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignerContract {
  id: string;
  designer_id: string;
  contract_number: string;
  contract_type: 'project' | 'retainer' | 'nda' | 'master_agreement';
  start_date?: string;
  end_date?: string;
  payment_terms?: string;
  deliverables?: Record<string, unknown>;
  total_value?: number;
  status: 'draft' | 'sent' | 'negotiating' | 'signed' | 'completed' | 'terminated';
  signed_date?: string;
  document_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignProject {
  id: string;
  project_name: string;
  project_code?: string;
  designer_id?: string;
  collection_id?: string;
  project_type: 'single_item' | 'collection' | 'variation' | 'refresh';
  current_stage: 'brief_creation' | 'designer_review' | 'contract_negotiation' | 
                'initial_concepts' | 'revision_1' | 'revision_2' | 'revision_3' | 
                'final_review' | 'technical_documentation' | 'approved_for_prototype' | 
                'on_hold' | 'cancelled';
  target_launch_date?: string;
  budget?: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  created_at: string;
  updated_at: string;
  // Joined fields
  designer_name?: string;
  designer_email?: string;
  brief_title?: string;
  deliverable_count?: number;
  revision_count?: number;
  latest_revision?: number;
}

export interface DesignBrief {
  id: string;
  design_project_id: string;
  title: string;
  description?: string;
  target_market?: string;
  price_point_min?: number;
  price_point_max?: number;
  materials_preference: string[];
  style_references: string[];
  functional_requirements?: string;
  dimensional_constraints?: Record<string, unknown>;
  sustainability_requirements?: string;
  created_by?: string;
  approved_date?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DesignDeliverable {
  id: string;
  design_project_id: string;
  deliverable_type: 'initial_sketch' | 'concept_presentation' | 'technical_drawing' | 
                   'line_drawing' | 'isometric' | '3d_model' | 'material_board' | 
                   'color_palette' | 'final_presentation' | 'production_files';
  version: number;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  status: 'pending' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  submitted_date?: string;
  reviewed_by?: string;
  review_date?: string;
  review_comments?: string;
  created_at: string;
}

export interface DesignRevision {
  id: string;
  design_project_id: string;
  revision_number: number;
  revision_stage?: string;
  requested_by?: string;
  request_date: string;
  revision_notes?: string;
  changes_requested: Array<{
    type: string;
    description: string;
    priority: 'urgent' | 'high' | 'normal' | 'low';
  }>;
  designer_response?: string;
  response_date?: string;
  approved: boolean;
  approved_by?: string;
  approval_date?: string;
  time_spent_hours?: number;
  created_at: string;
}

export interface DesignApproval {
  id: string;
  design_project_id: string;
  approval_type: 'brief' | 'concept' | 'revision' | 'final' | 'prototype_ready';
  approver_id?: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'conditional';
  approval_date?: string;
  conditions?: string;
  comments?: string;
  created_at: string;
}

export interface DesignerPerformance {
  id: string;
  designer_id: string;
  project_id?: string;
  on_time_delivery?: boolean;
  revision_count?: number;
  quality_rating?: number;
  creativity_rating?: number;
  communication_rating?: number;
  would_rehire?: boolean;
  notes?: string;
  created_at: string;
}

export interface DesignToPrototype {
  id: string;
  design_project_id: string;
  manufacturer_project_id?: string;
  prototype_status: 'pending_handoff' | 'with_manufacturer' | 'in_production' | 
                   'completed' | 'approved' | 'rejected';
  handoff_date?: string;
  estimated_completion?: string;
  actual_completion?: string;
  notes?: string;
  created_at: string;
}

// Dashboard aggregated types
export interface DesignerDashboardData {
  id: string;
  name: string;
  company_name?: string;
  contact_email: string;
  status: Designer['status'];
  rating?: number;
  specialties: string[];
  design_style: string[];
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  avg_quality_rating?: number;
  on_time_percentage?: number;
  avg_revisions?: number;
  created_at: string;
  updated_at: string;
}

export interface DesignProjectOverview {
  id: string;
  project_name: string;
  project_code?: string;
  current_stage: DesignProject['current_stage'];
  priority: DesignProject['priority'];
  target_launch_date?: string;
  designer_name?: string;
  designer_email?: string;
  designer_status?: Designer['status'];
  brief_title?: string;
  deliverable_count: number;
  revision_count: number;
  latest_revision?: number;
  project_status: 'ready' | 'stopped' | 'in_progress';
  created_at: string;
  updated_at: string;
}

// Form data types
export interface DesignerFormData {
  name: string;
  company_name: string;
  contact_email: string;
  phone: string;
  website: string;
  portfolio_url: string;
  specialties: string[];
  design_style: string[];
  hourly_rate?: number;
  currency: string;
  status: Designer['status'];
  years_experience?: number;
  certifications: string[];
  notes: string;
}

export interface DesignProjectFormData {
  project_name: string;
  project_code: string;
  current_stage?: DesignProject['current_stage'];
  designer_id?: string;
  designer_name?: string;
  collection_id?: string;
  project_type: DesignProject['project_type'];
  target_launch_date?: string;
  budget?: number;
  priority: DesignProject['priority'];
  manufacturer_name?: string;
  next_action?: string;
}

export interface DesignBriefFormData {
  title: string;
  description: string;
  target_market: string;
  price_point_min?: number;
  price_point_max?: number;
  materials_preference: string[];
  style_references: string[];
  functional_requirements: string;
  dimensional_constraints: Record<string, unknown>;
  sustainability_requirements: string;
}

// Constants
export const DESIGNER_SPECIALTIES = [
  'furniture',
  'lighting',
  'textiles',
  'ceramics',
  'metalwork',
  'glassware',
  'outdoor',
  'storage',
  'seating',
  'tables',
  'accessories',
  'art'
] as const;

export const DESIGN_STYLES = [
  'modern',
  'contemporary',
  'traditional',
  'minimalist',
  'industrial',
  'scandinavian',
  'mid_century',
  'art_deco',
  'rustic',
  'bohemian',
  'luxury',
  'sustainable'
] as const;

export const PROJECT_STAGES = [
  'brief_creation',
  'designer_review',
  'contract_negotiation',
  'initial_concepts',
  'revision_1',
  'revision_2',
  'revision_3',
  'final_review',
  'technical_documentation',
  'approved_for_prototype',
  'on_hold',
  'cancelled'
] as const;

export const DELIVERABLE_TYPES = [
  'initial_sketch',
  'concept_presentation',
  'technical_drawing',
  'line_drawing',
  'isometric',
  '3d_model',
  'material_board',
  'color_palette',
  'final_presentation',
  'production_files'
] as const;