import { useConversation } from "@/hooks/use-conversation";
import { ArrowLeft, PenBoxIcon, Search, UsersIcon } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { UserType } from "../../types/auth.type";
import AvatarWithBadge from "../avatar-with-badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Spinner } from "../ui/spinner";

const NewConversationPopover = () => {
  const navigate = useNavigate();
  const {
    fetchAllUsers,
    users,
    isUsersLoading,
    createConversation,
    isCreatingConversation,
  } = useConversation();

  const [isOpen, setIsOpen] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id)
        ? prev.filter((userId) => userId !== id)
        : [...prev, id],
    );
  };

  const handleBack = () => {
    resetState();
  };

  const resetState = () => {
    setIsGroupMode(false);
    setGroupName("");
    setUserSearch("");
    setSelectedUsers([]);
  };

  const filteredUsers =
    users?.filter((user) =>
      user.name.toLowerCase().includes(userSearch.trim().toLowerCase()),
    ) || [];

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    resetState();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers?.length === 0) return;
    const response = await createConversation({
      isGroup: true,
      participants: selectedUsers,
      groupName: groupName,
    });
    setIsOpen(false);
    resetState();
    navigate(`/conversation/${response?._id}`);
  };

  const handleCreateConversation = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      const response = await createConversation({
        isGroup: false,
        participantId: userId,
      });
      setIsOpen(false);
      resetState();
      navigate(`/conversation/${response?._id}`);
    } finally {
      setLoadingUserId(null);
      setIsOpen(false);
      resetState();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="size-8 rounded-lg" />
        }
      >
        <PenBoxIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="flex w-80 min-h-100 max-h-[80vh] flex-col rounded-xl p-0"
      >
        <div className="border-b p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {isGroupMode && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft size={16} />
              </Button>
            )}
            <h3 className="text-lg font-semibold">
              {isGroupMode ? "New Group" : "New Conversation"}
            </h3>
          </div>

          <InputGroup>
            {isGroupMode ? (
              <InputGroupInput
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            ) : (
              <InputGroupInput
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Enter user name"
              />
            )}

            <InputGroupAddon>
              {isGroupMode ? <UsersIcon /> : <Search />}
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div className="flex-1 justify-center overflow-y-auto px-1 py-1 space-y-1">
          {isUsersLoading ? (
            <Spinner className="w-6 h-6" />
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No users found
            </div>
          ) : !isGroupMode ? (
            <>
              <NewGroupItem
                disabled={isCreatingConversation}
                onClick={() => setIsGroupMode(true)}
              />
              {filteredUsers.map((user) => (
                <ConversationUserItem
                  key={user._id}
                  user={user}
                  isLoading={loadingUserId === user._id}
                  disabled={loadingUserId !== null}
                  onClick={handleCreateConversation}
                />
              ))}
            </>
          ) : (
            filteredUsers.map((user) => (
              <GroupUserItem
                key={user._id}
                user={user}
                isSelected={selectedUsers.includes(user._id)}
                onToggle={toggleUserSelection}
              />
            ))
          )}
        </div>

        {isGroupMode && (
          <div className="border-t p-3">
            <Button
              onClick={handleCreateGroup}
              className="w-full"
              disabled={
                isCreatingConversation ||
                !groupName.trim() ||
                selectedUsers.length === 0
              }
            >
              {isCreatingConversation && <Spinner className="w-4 h-4" />}
              Create Group
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

const UserAvatar = memo(({ user }: { user: UserType }) => (
  <>
    <AvatarWithBadge name={user.name} src={user.avatar ?? ""} />
    <div className="flex-1 min-w-0">
      <h5 className="text-[13.5px] font-medium truncate">{user.name}</h5>
      <p className="text-xs text-muted-foreground">
        Hey there! I'm using Messenger
      </p>
    </div>
  </>
));

UserAvatar.displayName = "UserAvatar";

const NewGroupItem = memo(
  ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
    >
      <div className="rounded-full bg-primary/10 p-2">
        <UsersIcon className="size-4 text-primary" />
      </div>
      <span className="text-sm font-medium">New Group</span>
    </button>
  ),
);

NewGroupItem.displayName = "NewGroupItem";

const ConversationUserItem = memo(
  ({
    user,
    isLoading,
    disabled,
    onClick,
  }: {
    user: UserType;
    disabled: boolean;
    isLoading: boolean;
    onClick: (id: string) => void;
  }) => (
    <button
      type="button"
      className="relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent disabled:opacity-50"
      disabled={isLoading || disabled}
      onClick={() => onClick(user._id)}
    >
      <UserAvatar user={user} />
      {isLoading && <Spinner className="absolute right-2 size-4" />}
    </button>
  ),
);

ConversationUserItem.displayName = "ConversationUserItem";

const GroupUserItem = memo(
  ({
    user,
    isSelected,
    onToggle,
  }: {
    user: UserType;
    isSelected: boolean;
    onToggle: (id: string) => void;
  }) => (
    <label
      role="button"
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-accent"
    >
      <UserAvatar user={user} />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(user._id)}
      />
    </label>
  ),
);

GroupUserItem.displayName = "GroupUserItem";

export default memo(NewConversationPopover);
