import AppWrapper from "@/components/app-wrapper";
import ConversationList from "@/components/conversation/conversation-list";
import useConversationId from "@/hooks/use-conversation-id";
import { cn } from "@/lib/utils";
import { Outlet } from "react-router-dom";

const AppLayout = () => {
  const conversationId = useConversationId();

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
