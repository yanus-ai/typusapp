import { createBrowserRouter, RouteObject, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import EmailVerificationPage from "./pages/auth/EmailVerificationPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OverviewPage from "./pages/profile/OverviewPage";
import AccountSettingsPage from "./pages/profile/AccountSettingsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCallback from "./components/auth/AuthCallback";
import CreatePage from "./pages/create/CreatePage";
import TweakPage from "./pages/tweak/TweakPage";
import RefinePage from "./pages/refine/RefinePage";
import SubscriptionPage from "./pages/subscription/SubscriptionPage";
import GalleryPage from "./pages/gallery/GalleryPage";
import TermsPage from "./pages/legal/TermsPage";
import DataPrivacyPage from "./pages/legal/DataPrivacyPage";
import ImprintPage from "./pages/legal/ImprintPage";

const routes: RouteObject[] = [
  {
    path: "/auth/callback",
    element: <AuthCallback />
  },
  {
    path: "/",
    element: <Navigate to="/create" replace />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/auth/verify-email",
    element: <EmailVerificationPage />,
  },
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/create",
    element: (
      <ProtectedRoute>
        <CreatePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/edit",
    element: (
      <ProtectedRoute>
        <TweakPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/upscale",
    element: (
      <ProtectedRoute>
        <RefinePage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/overview",
    element: (
      <ProtectedRoute>
        <OverviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/account-settings",
    element: (
      <ProtectedRoute>
        <AccountSettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/subscription",
    element: (
      <ProtectedRoute>
        <SubscriptionPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/gallery",
    element: (
      <ProtectedRoute>
        <GalleryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/explore",
    element: (
      <ProtectedRoute>
        <GalleryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/terms",
    element: <TermsPage />,
  },
  {
    path: "/data-privacy",
    element: <DataPrivacyPage />,
  },
  {
    path: "/imprint",
    element: <ImprintPage />,
  },
];

export const router = createBrowserRouter(routes);