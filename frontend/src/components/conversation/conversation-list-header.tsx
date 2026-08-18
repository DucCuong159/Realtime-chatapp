import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { NewConversationPopover } from "./new-conversation-popover";

const ConversationListHeader = ({
  onSearch,
}: {
  onSearch: (val: string) => void;
}) => {
  return (
    <div className="border-b border-border p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Conversation</h1>
        <NewConversationPopover />
      </div>
      <div>
        <InputGroup className="bg-background text-sm">
          <InputGroupInput
            placeholder="Search..."
            onChange={(e) => onSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search className="size-4 text-muted-foreground" />
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div>
  );
};

export default ConversationListHeader;
