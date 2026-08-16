import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Logo from "./components/logo";
import { Spinner } from "./components/ui/spinner";
import { useAuth } from "./hooks/use-auth";
import AppRoutes from "./routes";
import { isAuthRoute } from "./routes/routes";

function App() {
  const { pathname } = useLocation();
  const { user, isAuthStatus, isAuthStatusLoading } = useAuth();
  const isAuth = isAuthRoute(pathname);

  useEffect(() => {
    isAuthStatus();
  }, [isAuthStatus]);

  if (isAuthStatusLoading && !user && !isAuth)
    return (
      <div className="flex flex-col items-center justify-center h-screen w-screen">
        <Logo imgClass="size-20" />
        <Spinner className="w-6 h-6" />
      </div>
    );

  return <AppRoutes />;
}

export default App;
