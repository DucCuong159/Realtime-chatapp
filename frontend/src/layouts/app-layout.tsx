import AppWrapper from "@/components/app-wrapper";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  return (
    <AppWrapper>
      <div className="flex flex-col w-full h-auto">
        <Outlet />
      </div>
    </AppWrapper>
  );
};

export default AppLayout;
