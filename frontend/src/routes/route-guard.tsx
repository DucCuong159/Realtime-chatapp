import { useAuth } from "@/hooks/use-auth";
import { Navigate, Outlet } from "react-router-dom";

interface RouteGuardProps {
  requireAuth?: boolean;
}

const RouteGuard = ({ requireAuth = false }: RouteGuardProps) => {
  const { user } = useAuth();

  // 1. Protected route but user is not authenticated -> redirect to /sign-in
  if (requireAuth && !user) return <Navigate to="/sign-in" replace />;

  // 2. Public auth route but user is already authenticated -> redirect to /conversation
  if (!requireAuth && user) return <Navigate to="/conversation" replace />;

  return <Outlet />;
};

export default RouteGuard;
