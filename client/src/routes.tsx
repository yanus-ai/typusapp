import { createBrowserRouter, RouteObject } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import OverviewPage from "./pages/profile/OverviewPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AuthCallback from "./components/auth/AuthCallback";

const routes: RouteObject[] = [
  {
    path: "/auth/callback",
    element: <AuthCallback />
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
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
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <DashboardPage />
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
];

export const router = createBrowserRouter(routes);