import { useParams } from "react-router-dom";

const useConversationId = () => {
  const params = useParams<{ conversationId?: string }>();
  const conversationId = params.conversationId || null;
  return conversationId;
};

export default useConversationId;
