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
import Layout from './lib/Layout';
import FeedPage from './features/feed/FeedPage';
import HashtagFeed from './features/feed/HashtagFeed';
import ProfilePage from './features/profile/ProfilePage';
import NetworkPage from './pages/NetworkPage';
import MessagingPage from './features/messaging/MessagingPage';
import JobSearchPage from './features/jobs/JobSearchPage';
import JobDetailPage from './features/jobs/JobDetailPage';
import MyApplicationsPage from './features/jobs/MyApplicationsPage';
import CompanyPage from './features/companies/CompanyPage';
import NotificationList from './features/notifications/NotificationList';
import AssessmentLanding from './features/assessment/AssessmentLanding';
import IsolationMode from './features/assessment/IsolationMode';
import RecruiterDashboard from './features/recruiter/RecruiterDashboard';
import FullCandidateView from './features/recruiter/FullCandidateView';
import BillingSuccessPage from './features/billing/BillingSuccessPage';
import BillingSettings from './features/billing/BillingSettings';
import { useAssessmentStatus } from './features/assessment/useAssessment';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = useIsAuthenticated();
  return isAuth ? <>{children}</> : <Navigate to="/login" replace />;
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

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const user = useAuthStore(s => s.user);

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
        <Route path="/billing/success" element={<ProtectedRoute><BillingSuccessPage /></ProtectedRoute>} />

        {/* Authenticated app */}
        <Route path="/*" element={isAuthenticated ? (
          <Layout>
            <Routes>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/profile/:username" element={<ProfilePage />} />
              <Route path="/network" element={<NetworkPage />} />
              <Route path="/hashtag/:tag" element={<HashtagFeed />} />
              <Route path="/messages" element={<MessagingPage />} />
              <Route path="/jobs" element={<JobSearchPage />} />
              <Route path="/jobs/:id" element={<JobDetailPage />} />
              <Route path="/applications" element={<MyApplicationsPage />} />
              <Route path="/companies/:slug" element={<CompanyPage />} />
              <Route path="/notifications" element={
                <div className="max-w-2xl mx-auto px-4 py-6 card">
                  <div className="px-4 py-3 border-b"><h1 className="font-bold text-gray-900">Notifications</h1></div>
                  <NotificationList />
                </div>
              } />
              <Route path="/assessment" element={<AssessmentLanding />} />
              <Route path="/assessment/active" element={<IsolationMode />} />
              <Route path="/recruiter" element={<RecruiterDashboard />} />
              <Route path="/recruiter/candidates/:userId" element={<FullCandidateView />} />
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
