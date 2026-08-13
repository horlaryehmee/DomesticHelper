export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from: number | null
  to: number | null
}

export interface SkillRef {
  id: number
  name: string
  slug?: string
  years?: number
}

export interface TrustScoreData {
  score: number
  category: 'high' | 'moderate' | 'needs_review' | 'new'
  label: string
  calculated_at?: string
}

export interface HelperSummary {
  uuid: string
  name: string
  photo_url: string | null
  city: string | null
  state: string | null
  gender?: string
  bio?: string | null
  years_experience: number
  availability: string | null
  employment_type: string | null
  expected_salary_min: number | null
  expected_salary_max: number | null
  skills: SkillRef[]
  verification_status: string
  verification_badges: string[]
  trust_score: TrustScoreData
  average_rating: number
  reviews_count: number
  verified_jobs_count: number
  last_active_at?: string
}

export interface JobSummary {
  uuid: string
  title: string
  work_type: string
  description: string
  responsibilities?: string | null
  requirements?: string | null
  salary_min: number | null
  salary_max: number | null
  salary_type: string
  location: string | null
  state: string | null
  city: string | null
  working_hours: string | null
  accommodation_available: boolean
  employment_type: string
  start_date: string | null
  status: string
  expires_at?: string
  employer?: {
    uuid: string
    name: string
    profile_type: string
    state?: string | null
  } | null
  applications_count?: number
  my_application?: string | null
  created_at?: string
}

export interface ReviewSummary {
  uuid: string
  rating: number
  work_type: string | null
  duration_worked: string | null
  feedback: string
  status?: string
  job_role?: string | null
  employer_name?: string
  employer_type?: string
  responses?: { author_name: string; content: string; created_at: string }[]
  employment?: { uuid: string; job_role: string; start_date: string | null; end_date: string | null } | null
  created_at: string
}

export interface EmploymentHistoryEntry {
  uuid: string
  job_role: string
  start_date: string | null
  end_date: string | null
  location: string | null
  employment_type?: string
  status?: string
}
