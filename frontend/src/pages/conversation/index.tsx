import EmptyState from "@/components/conversation/empty-state";

const Conversation = () => {
  return (
    <div className="hidden md:block h-svh">
      <EmptyState />
    </div>
  );
};

export default Conversation;
