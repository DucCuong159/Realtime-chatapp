import { Button } from "@/components/ui/button";
import { useConversation } from "@/hooks/use-conversation";
import type { MessageType } from "@/types/conversation.type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ImageIcon, SendHorizontal, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ConversationReplyBar from "./reply-bar";

interface Props {
  conversationId: string | null;
  currentUserId: string | null;
  replyTo: MessageType | null;
  onCancelReply: () => void;
}

const messageSchema = z.object({
  message: z.string().optional(),
});

type MessageFormType = z.infer<typeof messageSchema>;

const ConversationFooter = ({
  conversationId,
  currentUserId,
  replyTo,
  onCancelReply,
}: Props) => {
  const { sendMessage } = useConversation();

  const [image, setImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<MessageFormType>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  const {
    ref: registerRef,
    onChange: handleRegisterChange,
    ...restMessageRegister
  } = form.register("message");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Max image file size: 10MB (Base64 encoding will be ~13.3MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = (values: MessageFormType) => {
    const messageContent = values.message?.trim();
    const currentImage = image;

    if (!messageContent && !currentImage) return;

    form.reset({ message: "" });
    handleRemoveImage();
    onCancelReply();

    if (textareaRef.current) {
      textareaRef.current.style.height = "36px";
      textareaRef.current.style.overflowY = "hidden";
    }

    // Send payload in background (non-blocking)
    sendMessage({
      conversationId,
      content: messageContent,
      image: currentImage || undefined,
      replyTo: replyTo,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.handleSubmit(onSubmit)();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleRegisterChange(e);
    const textarea = e.target;
    textarea.style.height = "36px";
    const newHeight = Math.max(36, Math.min(textarea.scrollHeight, 144));
    textarea.style.height = `${newHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 144 ? "auto" : "hidden";
  };

  return (
    <>
      <div className="sticky bottom-0 z-40 inset-x-0 bg-background border-t border-border py-2.5 sm:py-3">
        {image && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-2.5">
            <div className="relative w-fit">
              <img
                src={image}
                alt="Preview"
                className="h-20 w-20 rounded-lg object-cover border border-border bg-muted"
              />

              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full"
                onClick={handleRemoveImage}
                aria-label="Remove image"
              >
                <X className="size-3" />
              </Button>
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => form.handleSubmit(onSubmit)(e)}
          className="max-w-6xl mx-auto px-4 sm:px-6 flex items-end gap-2"
        >
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full shrink-0 text-muted-foreground hover:text-foreground size-9"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Attach image"
            >
              <ImageIcon className="size-5" />
            </Button>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              ref={imageInputRef}
              onChange={handleImageChange}
            />
          </div>

          <textarea
            {...restMessageRegister}
            ref={(e) => {
              registerRef(e);
              textareaRef.current = e;
            }}
            rows={1}
            autoComplete="off"
            placeholder="Aa"
            onKeyDown={handleKeyDown}
            onChange={handleTextareaChange}
            className="flex-1 h-9 min-h-9 max-h-36 resize-none rounded-[18px] bg-muted/80 dark:bg-[#3A3B3C] text-foreground dark:text-[#E4E6EB] px-4 py-2 text-sm leading-5 outline-none focus:ring-1 focus:ring-primary/40 overflow-hidden placeholder:text-muted-foreground"
          />

          <Button
            type="submit"
            size="icon"
            className="rounded-full size-9 shrink-0 bg-[#2a7bff] hover:bg-[#2066d9] text-white"
            aria-label="Send message"
          >
            <SendHorizontal className="size-4" />
          </Button>
        </form>
      </div>

      {replyTo && (
        <ConversationReplyBar
          replyTo={replyTo}
          currentUserId={currentUserId}
          onCancel={onCancelReply}
        />
      )}
    </>
  );
};

export default ConversationFooter;
