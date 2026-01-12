import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "react-hot-toast";

import { useAuth } from "./hooks/useAuth";
import "./App.css";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardOverviewPage from "./pages/DashboardOverview";
import ProtectedRoute from "./layout/components/ProtectedRoute";
import CampaignsPage from "./pages/CampaignPage";
import PublicLayout from "./components/layout/PublicLayout";
import HomePage from "./pages/HomePage";
import PricingPage from "./pages/PricingPage";
import ContactPage from "./pages/ContactPage";
import AboutPage from "./pages/AboutPage";
import DashboardLayout from "./components/layout/Dashboardlayout";

import SendPage from "./pages/SendPage";
import OutboxPage from "./pages/OutboxPage";
import ApiPage from "./pages/ApiPage";
import ProfilePage from "./pages/ProfilePage";

import AdminProtectedRoute from "./components/AdminProtectedRoute";
import AdminLayout from "./components/layout/AdminLayout";
import ManageBusinessesPage from "./pages/admin/ManageBusinessPage";
import ManagePlansPage from "./pages/admin/ManagePlansPage";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ManageSubmissionsPage from "./pages/admin/ManageSubmissions";
import HelpPage from "./pages/HelpPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";

const GOOGLE_CLIENT_ID =
  "385092667687-bo3674j434681511p9kuchhcu03jip9c.apps.googleusercontent.com";
const Home = () => {
  const { token } = useAuth();

  return token ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};
function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            className: "bg-gray-800 text-white",
          }}
        />
        <Router>
          <Routes>
            {/* Section 1: Public Website Routes */}
            {/* All these routes will be wrapped by the PublicLayout, giving them the public navbar and footer. */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
            </Route>

            {/* Section 2: Standalone Auth Routes (No Navbar/Footer) */}
            {/* These pages have their own full-page design. */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Section 3: Protected Dashboard Routes */}
            {/* These routes are only accessible to logged-in users. */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<DashboardOverviewPage />} />
                <Route path="/dashboard/send" element={<SendPage />} />
                <Route
                  path="/dashboard/campaigns"
                  element={<CampaignsPage />}
                />
                <Route path="/dashboard/outbox" element={<OutboxPage />} />
                <Route path="/dashboard/api" element={<ApiPage />} />
                <Route path="/dashboard/profile" element={<ProfilePage />} />
                <Route path="/dashboard/help" element={<HelpPage />} />
              </Route>
            </Route>

            <Route element={<AdminProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route
                  path="/admin/businesses"
                  element={<ManageBusinessesPage />}
                />
                <Route path="/admin/plans" element={<ManagePlansPage />} />
                <Route
                  path="/admin/submissions"
                  element={<ManageSubmissionsPage />}
                />
              </Route>
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
