import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated, useAuthStore, homeRouteForRole } from './features/auth/useAuth';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ForgotPasswordPage from './features/auth/ForgotPasswordPage';
import ResetPasswordPage from './features/auth/ResetPasswordPage';
import PublicVerifyPage from './pages/PublicVerifyPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import LandingPage from './pages/LandingPage';
import PricingPage from './features/billing/PricingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import Layout from './lib/Layout';
import FeedPage from './features/feed/FeedPage';
import HashtagFeed from './features/feed/HashtagFeed';
import ProfilePage from './features/profile/ProfilePage';
import { useParams as useProfileParams } from 'react-router-dom';

// Forces a fresh ProfilePage fiber on every username change.
// Without this, React Router reuses the same fiber between /profile/A and
// /profile/B, which causes React error #310 when the hook count changed
// between code deployments.
function ProfilePageWithKey() {
  const { username } = useProfileParams<{ username: string }>();
  return <ProfilePage key={username ?? '_'} />;
}
import NetworkPage from './pages/NetworkPage';
import MessagingPage from './features/messaging/MessagingPage';
import JobSearchPage from './features/jobs/JobSearchPage';
import JobDetailPage from './features/jobs/JobDetailPage';
import MyApplicationsPage from './features/jobs/MyApplicationsPage';
import CompanyPage from './features/companies/CompanyPage';
import NotificationsPage from './features/notifications/NotificationsPage';
import AssessmentLanding from './features/assessment/AssessmentLanding';
import IsolationMode from './features/assessment/IsolationMode';
import RecruiterDashboard from './features/recruiter/RecruiterDashboard';
import FullCandidateView from './features/recruiter/FullCandidateView';
import AdminDashboard from './features/admin/AdminDashboard';
import BillingSuccessPage from './features/billing/BillingSuccessPage';
import BillingSettings from './features/billing/BillingSettings';
import PostDetailPage from './pages/PostDetailPage';
import { useAssessmentStatus } from './features/assessment/useAssessment';
import { useNotificationSocket } from './features/notifications/useNotifications';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Gates routes to platform_admin only; everyone else is bounced to their role home. */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  const user = useAuthStore(s => s.user);
  if (!isAuth) return <Navigate to="/login" replace />;
  if (user?.role !== 'platform_admin') return <Navigate to={homeRouteForRole(user?.role ?? 'candidate')} replace />;
  return <>{children}</>;
}

/** Redirect logged-in users away from guest pages (login/register) to their role home */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  const user = useAuthStore(s => s.user);
  if (!isAuth) return <>{children}</>;
  return <Navigate to={homeRouteForRole(user?.role ?? 'candidate')} replace />;
}

function AssessmentOverlay() {
  const status = useAssessmentStatus();
  if (status === 'idle' || status === 'starting' || status === 'error') return null;
  return <IsolationMode />;
}

// Smart route guard for /assessment/active: redirects to /assessment when no session is active.
// During an active/completed/terminated session, the global AssessmentOverlay handles the UI.
function AssessmentActiveRoute() {
  const status = useAssessmentStatus();
  if (status === 'idle' || status === 'error') return <Navigate to="/assessment" replace />;
  return null; // overlay handles UI
}

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthStore(s => s.user);
  // PARTIAL-06: mount the notification socket at the App level so it survives
  // the assessment overlay and any route that renders without Layout.
  useNotificationSocket();

  return (
    <>
      <AssessmentOverlay />
      <Routes>
        {/* Public marketing landing page */}
        <Route path="/" element={isAuthenticated
          ? <Navigate to={homeRouteForRole(user?.role ?? 'candidate')} replace />
          : <LandingPage />}
        />

        {/* Guest-only auth pages */}
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

        {/* Public pages */}
        <Route path="/verify/:certificateId" element={<PublicVerifyPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/billing/success" element={<ProtectedRoute><BillingSuccessPage /></ProtectedRoute>} />

        {/* Authenticated app */}
        <Route path="/*" element={isAuthenticated ? (
          <Layout>
            <Routes>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/posts/:id" element={<PostDetailPage />} />
              <Route path="/profile/:username" element={<ProfilePageWithKey />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/hashtag/:tag" element={<HashtagFeed />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/jobs" element={<JobSearchPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/applications" element={<MyApplicationsPage />} />
              <Route path="/companies/:slug" element={<CompanyPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/assessment" element={<AssessmentLanding />} />
              <Route path="/assessment/active" element={<AssessmentActiveRoute />} />
              <Route path="/recruiter" element={<RecruiterDashboard />} />
              <Route path="/recruiter/candidates/:userId" element={<FullCandidateView />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/billing" element={<BillingSettings />} />
              {/* Role-based default redirect */}
              <Route path="/" element={<Navigate to={homeRouteForRole(user?.role ?? 'candidate')} replace />} />
              <Route path="*" element={<Navigate to={homeRouteForRole(user?.role ?? 'candidate')} replace />} />
            </Routes>
          </Layout>
        ) : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}
