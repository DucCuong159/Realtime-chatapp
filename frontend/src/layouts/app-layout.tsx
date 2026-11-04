import AppWrapper from "@/components/app-wrapper";
import ConversationList from "@/components/conversation/conversation-list";
import useConversationId from "@/hooks/use-conversation-id";
import { cn } from "@/lib/utils";
import { Outlet, useLocation } from "react-router-dom";

const AppLayout = () => {
  const conversationId = useConversationId();
  const location = useLocation();
  const isProfilePage = location.pathname.startsWith("/profile");

  if (isProfilePage) {
    return (
      <AppWrapper>
        <div className="h-full pl-14">
          <Outlet />
        </div>
      </AppWrapper>
    );
  }

  return (
    <AppWrapper>
      <div className="h-full">
        <div className={cn(conversationId ? "hidden md:block" : "block")}>
          <ConversationList />
        </div>
        <div
          className={cn(
            "pl-14 md:pl-108.75!",
            !conversationId ? "hidden md:block" : "block",
          )}
        >
          <Outlet />
        </div>
      </div>
    </AppWrapper>
  );
};

export default AppLayout;
