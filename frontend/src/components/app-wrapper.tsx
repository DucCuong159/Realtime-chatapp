import type { ReactNode } from "react";

interface AppWrapperProps {
  children: ReactNode;
}

const AppWrapper = ({ children }: AppWrapperProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Toolbar */}
      <main className="flex-1">{children}</main>
    </div>
  );
};

export default AppWrapper;
