import { createBrowserRouter, RouteObject, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import EmailVerificationPage from "./pages/auth/EmailVerificationPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OverviewPage from "./pages/profile/OverviewPage";
import AccountSettingsPage from "./pages/profile/AccountSettingsPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import MobileProtectedRoute from "./components/auth/MobileProtectedRoute";
import AuthCallback from "./components/auth/AuthCallback";
import CreatePage from "./pages/create/page";
import TweakPage from "./pages/tweak/TweakPage";
import RefinePage from "./pages/refine/RefinePage";
import SubscriptionPage from "./pages/subscription/SubscriptionPage";
import GalleryPage from "./pages/gallery/GalleryPage";
import TermsPage from "./pages/legal/TermsPage";
import DataPrivacyPage from "./pages/legal/DataPrivacyPage";
import ImprintPage from "./pages/legal/ImprintPage";
import AcademyPage from "@/pages/dashboard/AcademyPage";
import PluginsPage from "@/pages/dashboard/PluginsPage";
import Buycredits from "./pages/buycredits/Buycredits";
import PaymentHistory from "./pages/payment/PaymentHistory";

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
    path: "/auth/reset-password",
    element: <ResetPasswordPage />,
  },
  {
    path: "/dashboard",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/create",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <CreatePage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/edit",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <TweakPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/upscale",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <RefinePage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/overview",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <OverviewPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/account-settings",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <AccountSettingsPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/subscription",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/payment-history",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <PaymentHistory />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/buy-credits",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <Buycredits />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/gallery",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <GalleryPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/explore",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <GalleryPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
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
  {
    path: "/plugins",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <PluginsPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
  {
    path: "/academy",
    element: (
      <MobileProtectedRoute>
        <ProtectedRoute>
          <AcademyPage />
        </ProtectedRoute>
      </MobileProtectedRoute>
    ),
  },
];

export const router = createBrowserRouter(routes);