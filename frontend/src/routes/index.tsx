import { Spinner } from "@/components/ui/spinner";
import AppLayout from "@/layouts/app-layout";
import BaseLayout from "@/layouts/base-layout";
import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RouteGuard from "./route-guard";
import { AUTH_ROUTES, authRoutesPath, protectedRoutesPath } from "./routes";

const RouteLoadingFallback = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <Spinner className="size-8" />
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Auth Routes (Public) */}
        <Route element={<RouteGuard requireAuth={false} />}>
          <Route element={<BaseLayout />}>
            {authRoutesPath.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Route>
        </Route>

        {/* Protected Routes (Private) */}
        <Route element={<RouteGuard requireAuth />}>
          <Route element={<AppLayout />}>
            {protectedRoutesPath.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Route>
        </Route>

        {/* Redirect root "/" to "/sign-in" (or "/conversation" when authenticated) */}
        <Route
          path="/"
          element={<Navigate to={AUTH_ROUTES.SIGN_IN} replace />}
        />
        {/* 404 Catch-all fallback */}
        <Route
          path="*"
          element={<Navigate to={AUTH_ROUTES.SIGN_IN} replace />}
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
