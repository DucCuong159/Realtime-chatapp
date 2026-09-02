import type { ReactNode } from "react";
import AsideBar from "./aside-bar";
import CallManager from "./call/call-manager";

interface AppWrapperProps {
  children: ReactNode;
}

const AppWrapper = ({ children }: AppWrapperProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <AsideBar />
      <main className="flex-1">{children}</main>
      <CallManager />
    </div>
  );
};

export default AppWrapper;

