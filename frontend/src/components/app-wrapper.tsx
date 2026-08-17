import type { ReactNode } from "react";
import AsideBar from "./aside-bar";

interface AppWrapperProps {
  children: ReactNode;
}

const AppWrapper = ({ children }: AppWrapperProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <AsideBar />
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default AppWrapper;
