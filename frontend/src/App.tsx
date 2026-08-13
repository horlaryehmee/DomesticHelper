import { Routes, Route, Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './lib/auth'
import { PageLoader } from './components/ui/spinner'

import { PublicLayout } from './components/layout/public-layout'
import { DashboardLayout } from './components/layout/dashboard-layout'
import { AdminLayout } from './components/layout/admin-layout'

import { LandingPage } from './features/landing/landing-page'
import { SearchPage } from './features/helpers/search-page'
import { HelperProfilePage } from './features/helpers/helper-profile-page'
import { JobsPage } from './features/jobs/jobs-page'
import { JobDetailPage } from './features/jobs/job-detail-page'
import { LoginPage } from './features/auth/login-page'
import { RegisterPage } from './features/auth/register-page'
import { ForgotPasswordPage } from './features/auth/forgot-password-page'
import { NotFoundPage } from './features/misc/not-found-page'
import { VerifyEmploymentPage } from './features/misc/verify-employment-page'
import { PaymentCallbackPage } from './features/payments/payment-callback-page'

import { EmployerDashboardPage } from './features/employer/dashboard-page'
import { EmployerProfilePage } from './features/employer/profile-page'
import { SavedHelpersPage } from './features/employer/saved-helpers-page'
import { EmployerJobsPage } from './features/employer/jobs-page'
import { EmployerApplicationsPage } from './features/employer/applications-page'
import { InterviewsPage } from './features/shared/interviews-page'
import { EmploymentsPage } from './features/shared/employments-page'
import { ReportsPage } from './features/shared/reports-page'
import { ReviewsPage } from './features/shared/reviews-page'
import { VerificationReportsPage } from './features/employer/verification-reports-page'

import { HelperDashboardPage } from './features/helper/dashboard-page'
import { HelperProfileEditPage } from './features/helper/profile-edit-page'
import { HelperVerificationPage } from './features/helper/verification-page'
import { HelperApplicationsPage } from './features/helper/applications-page'
import { DisputesPage } from './features/helper/disputes-page'

import { MessagesPage } from './features/messages/messages-page'
import { NotificationsPage } from './features/notifications/notifications-page'
import { SettingsPage } from './features/shared/settings-page'

import { AdminDashboardPage } from './features/admin/dashboard-page'
import { AdminUsersPage } from './features/admin/users-page'
import { AdminVerificationsPage } from './features/admin/verifications-page'
import { AdminReportsPage } from './features/admin/reports-page'
import { AdminReviewsPage } from './features/admin/reviews-page'
import { AdminDisputesPage } from './features/admin/disputes-page'
import { AdminJobsPage } from './features/admin/jobs-page'
import { AdminPaymentsPage } from './features/admin/payments-page'
import { AdminTrustScorePage } from './features/admin/trust-score-page'
import { AdminAuditLogsPage } from './features/admin/audit-logs-page'
import { AdminSettingsPage } from './features/admin/settings-page'

function Protected({ children, types }: { children: ReactNode; types?: string[] }) {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (types && !types.includes(user.user_type)) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/helpers/:uuid" element={<HelperProfilePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:uuid" element={<JobDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-employment/:token" element={<VerifyEmploymentPage />} />
        <Route path="/payments/callback" element={<PaymentCallbackPage />} />
        <Route path="/payments/sandbox" element={<PaymentCallbackPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Employer area */}
      <Route
        element={
          <Protected types={['employer']}>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route path="/employer" element={<EmployerDashboardPage />} />
        <Route path="/employer/profile" element={<EmployerProfilePage />} />
        <Route path="/employer/saved-helpers" element={<SavedHelpersPage />} />
        <Route path="/employer/jobs" element={<EmployerJobsPage />} />
        <Route path="/employer/applications" element={<EmployerApplicationsPage />} />
        <Route path="/employer/interviews" element={<InterviewsPage />} />
        <Route path="/employer/employments" element={<EmploymentsPage />} />
        <Route path="/employer/reports" element={<ReportsPage />} />
        <Route path="/employer/reviews" element={<ReviewsPage />} />
        <Route path="/employer/verification-reports" element={<VerificationReportsPage />} />
        <Route path="/employer/messages" element={<MessagesPage />} />
        <Route path="/employer/notifications" element={<NotificationsPage />} />
        <Route path="/employer/settings" element={<SettingsPage />} />
      </Route>

      {/* Helper area */}
      <Route
        element={
          <Protected types={['helper']}>
            <DashboardLayout />
          </Protected>
        }
      >
        <Route path="/helper" element={<HelperDashboardPage />} />
        <Route path="/helper/profile" element={<HelperProfileEditPage />} />
        <Route path="/helper/verification" element={<HelperVerificationPage />} />
        <Route path="/helper/applications" element={<HelperApplicationsPage />} />
        <Route path="/helper/interviews" element={<InterviewsPage />} />
        <Route path="/helper/employments" element={<EmploymentsPage />} />
        <Route path="/helper/reports" element={<ReportsPage />} />
        <Route path="/helper/reviews" element={<ReviewsPage />} />
        <Route path="/helper/disputes" element={<DisputesPage />} />
        <Route path="/helper/messages" element={<MessagesPage />} />
        <Route path="/helper/notifications" element={<NotificationsPage />} />
        <Route path="/helper/settings" element={<SettingsPage />} />
      </Route>

      {/* Admin area */}
      <Route
        element={
          <Protected types={['admin']}>
            <AdminLayout />
          </Protected>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/reviews" element={<AdminReviewsPage />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/jobs" element={<AdminJobsPage />} />
        <Route path="/admin/payments" element={<AdminPaymentsPage />} />
        <Route path="/admin/trust-scores" element={<AdminTrustScorePage />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
      </Route>
    </Routes>
  )
}
