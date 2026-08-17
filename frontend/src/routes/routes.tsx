import SignIn from "@/pages/auth/sign-in";
import SignUp from "@/pages/auth/sign-up";
import Conversation from "@/pages/conversation";
import SingleConversation from "@/pages/conversation/conversationId";

export const AUTH_ROUTES = {
  SIGN_IN: "/sign-in",
  SIGN_UP: "/sign-up",
};

export const PROTECTED_ROUTES = {
  CONVERSATION: "/conversation",
  SINGLE_CONVERSATION: "/conversation/:conversationId",
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
    path: PROTECTED_ROUTES.CONVERSATION,
    component: <Conversation />,
  },
  {
    path: PROTECTED_ROUTES.SINGLE_CONVERSATION,
    component: <SingleConversation />,
  },
];

export const isAuthRoute = (pathname: string) => {
  return Object.values(AUTH_ROUTES).includes(pathname);
};
