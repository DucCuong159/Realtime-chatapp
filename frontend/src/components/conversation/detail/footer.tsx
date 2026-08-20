import { Button } from "@/components/ui/button";
import { useConversation } from "@/hooks/use-conversation";
import type { MessageType } from "@/types/conversation.type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image as ImageIcon, SendHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import ConversationReplyBar from "./reply-bar";

interface Props {
  conversationId: string | null;
  currentUserId: string | null;
  replyTo: MessageType | null;
  isAiConversation: boolean;
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
  isAiConversation,
  onCancelReply,
}: Props) => {
  const { sendMessage, isSendingMsg, singleConversation } = useConversation();
  const isAIStreaming = Boolean(
    singleConversation?.messages.some((m) => m.streaming),
  );
  const isBusy = isSendingMsg || isAIStreaming;

  const [image, setImage] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (image || replyTo) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [image, replyTo]);

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
    reader.onerror = () => toast.error("Failed to read the image file");
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const onSubmit = (values: MessageFormType) => {
    if (isBusy) return;
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

    const payload = {
      conversationId,
      content: messageContent,
      image: currentImage || undefined,
      replyTo: replyTo,
    };
    // Send payload in background (non-blocking)
    sendMessage(payload, isAiConversation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
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
    <div className="sticky bottom-0 z-40 inset-x-0 bg-background border-t border-border py-2.5 sm:py-3">
      {replyTo && (
        <ConversationReplyBar
          replyTo={replyTo}
          currentUserId={currentUserId}
          onCancel={onCancelReply}
        />
      )}

      {image && !isSendingMsg && (
        <div className="px-4 sm:px-6 pb-2.5">
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
        className="px-4 sm:px-6 flex items-end gap-2"
      >
        <div className="flex items-center">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full shrink-0 text-muted-foreground hover:text-foreground size-9"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Attach image"
            disabled={isBusy}
          >
            <ImageIcon className="size-5" />
          </Button>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            ref={imageInputRef}
            disabled={isBusy}
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
          disabled={isBusy}
        >
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
};

export default ConversationFooter;
