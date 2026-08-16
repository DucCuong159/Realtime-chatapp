import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import AppLoader from "./components/app-loader";
import { useAuth } from "./hooks/use-auth";
import AppRoutes from "./routes";
import { isAuthRoute } from "./routes/routes";

function App() {
  const { pathname } = useLocation();
  const { isAuthStatus, isInitialized } = useAuth();
  const isAuth = isAuthRoute(pathname);

  useEffect(() => {
    isAuthStatus();
  }, [isAuthStatus]);

  if (!isInitialized && !isAuth) return <AppLoader text="Please wait..." />;

  return <AppRoutes />;
}

export default App;
