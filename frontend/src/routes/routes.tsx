import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export const AUTH_ROUTES = {
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
};

export const PROTECTED_ROUTES = {
  CONVERSATION: "/conversation",
  SINGLE_CONVERSATION: "/conversation/:conversationId",
};

export interface RouteConfig {
  path: string;
  Component: LazyExoticComponent<ComponentType<unknown>>;
}

export const authRoutesPath: RouteConfig[] = [
  {
    path: AUTH_ROUTES.SIGN_IN,
    Component: lazy(() => import("@/pages/auth/sign-in")),
  },
  {
    path: AUTH_ROUTES.SIGN_UP,
    Component: lazy(() => import("@/pages/auth/sign-up")),
  },
];

export const protectedRoutesPath: RouteConfig[] = [
  {
    path: PROTECTED_ROUTES.CONVERSATION,
    Component: lazy(() => import("@/pages/conversation")),
  },
  {
    path: PROTECTED_ROUTES.SINGLE_CONVERSATION,
    Component: lazy(() => import("@/pages/conversation/conversationId")),
  },
];

export const isAuthRoute = (pathname: string): boolean => {
  const routes: string[] = Object.values(AUTH_ROUTES);
  return routes.includes(pathname);
};
