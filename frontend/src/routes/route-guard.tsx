import { Navigate, Outlet } from "react-router-dom";

interface RouteGuardProps {
  requireAuth?: boolean;
}

const RouteGuard = ({ requireAuth = false }: RouteGuardProps) => {
  // TODO: Retrieve isAuthenticated from auth store (e.g., Zustand or Context)
  // const { isAuthenticated } = useAuthStore();
  const isAuthenticated = false; // Temporary placeholder for development

  // 1. Protected route but user is not authenticated -> redirect to /sign-in
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/sign-in" replace />;
  }

  // 2. Public auth route but user is already authenticated -> redirect to /chat
  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  return <Outlet />;
};

export default RouteGuard;
