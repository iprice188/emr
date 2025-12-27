// Database types based on Supabase schema

export type JobStatus =
  | 'draft'
  | 'quoting'
  | 'quoted'
  | 'accepted'
  | 'in_progress'
  | 'complete'
  | 'invoiced'
  | 'paid'

export type PhotoType = 'site_visit' | 'progress' | 'completion' | 'other'

export interface Customer {
  id: string
  created_at: string
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface Job {
  id: string
  created_at: string
  customer_id: string
  title: string
  description?: string
  notes?: string
  status: JobStatus

  // Dates
  quote_date?: string
  quote_valid_until?: string
  start_date?: string
  end_date?: string
  invoice_date?: string
  paid_date?: string

  // Location
  job_address?: string

  // Materials
  materials_notes?: string
  materials_cost?: number
  supplier_quotes_attachments?: string[]

  // Labour
  labour_days?: number
  labour_day_rate?: number
  labour_cost?: number

  // Other
  other_costs?: number
  other_costs_notes?: string

  // Totals
  subtotal?: number
  vat_amount?: number
  total?: number

  // Invoice specific
  invoice_number?: number
  payment_reference?: string

  // Relations (populated by joins)
  customer?: Customer
}

export interface Photo {
  id: string
  job_id: string
  created_at: string
  storage_path: string
  caption?: string
  photo_type: PhotoType
}

export interface Settings {
  id: string
  user_id: string

  // Business details
  business_name?: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  logo_url?: string

  // Financial
  default_day_rate?: number
  vat_registered: boolean
  vat_number?: string
  bank_details?: string

  // Message templates
  quote_message_template?: string
  invoice_message_template?: string

  // Quote settings
  default_quote_validity_days: number
}

// Request/form types
export interface CustomerFormData {
  name: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface JobFormData {
  customer_id: string
  title: string
  description?: string
  notes?: string
  status?: JobStatus
  materials_notes?: string
  materials_cost?: number
  labour_days?: number
  labour_day_rate?: number
  labour_cost?: number
  other_costs?: number
  other_costs_notes?: string
  start_date?: string
  job_address?: string
}
