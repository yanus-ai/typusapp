import { createBrowserRouter, RouteObject, Navigate } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import EmailVerificationPage from "./pages/auth/EmailVerificationPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OverviewPage from "./pages/profile/OverviewPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCallback from "./components/auth/AuthCallback";
import CreatePage from "./pages/create/CreatePage";
import TweakPage from "./pages/tweak/TweakPage";
import RefinePage from "./pages/refine/RefinePage";
import SubscriptionPage from "./pages/subscription/SubscriptionPage";
import GalleryPage from "./pages/gallery/GalleryPage";

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
];

export const router = createBrowserRouter(routes);