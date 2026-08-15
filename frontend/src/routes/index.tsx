import AppLayout from "@/layouts/app-layout";
import BaseLayout from "@/layouts/base-layout";
import { Navigate, Route, Routes } from "react-router-dom";
import RouteGuard from "./route-guard";
import { authRoutesPath, protectedRoutesPath } from "./routes";

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth Routes (Public) */}
      <Route element={<RouteGuard requireAuth={false} />}>
        <Route element={<BaseLayout />}>
          {authRoutesPath.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.component}
            />
          ))}
        </Route>
      </Route>

      {/* Protected Routes (Private) */}
      <Route element={<RouteGuard requireAuth />}>
        <Route element={<AppLayout />}>
          {protectedRoutesPath.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={route.component}
            />
          ))}
        </Route>
      </Route>

      {/* Redirect root "/" to "/sign-in" (or "/chat" when authenticated) */}
      <Route path="/" element={<Navigate to="/sign-in" replace />} />
      {/* 404 Catch-all fallback */}
      <Route path="*" element={<Navigate to="/sign-in" replace />} />
    </Routes>
  );
};

export default AppRoutes;
