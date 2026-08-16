import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import Chat from "@/pages/chat";
import SingleChat from "@/pages/chat/chatId";

const AUTH_ROUTES = {
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
};

const PROTECTED_ROUTES = {
  CHAT: "/chat",
  SINGLE_CHAT: "/chat/:chatId",
};

export const authRoutesPath = [
  {
    path: AUTH_ROUTES.SIGN_IN,
    component: <SignIn />,
  },
  {
    path: AUTH_ROUTES.SIGN_UP,
    component: <SignUp />,
  },
];

export const protectedRoutesPath = [
  {
    path: PROTECTED_ROUTES.CHAT,
    component: <Chat />,
  },
  {
    path: PROTECTED_ROUTES.SINGLE_CHAT,
    component: <SingleChat />,
  },
];

export const isAuthRoute = (pathname: string) => {
  return Object.values(AUTH_ROUTES).includes(pathname);
};
