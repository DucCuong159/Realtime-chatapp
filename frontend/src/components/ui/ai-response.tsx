"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

const ALLOWED_LINK_PREFIXES = ["https://", "http://", "mailto:"];
const ALLOWED_IMAGE_PREFIXES = ["https://", "http://"];

const Response = memo(
  ({
    className,
    defaultOrigin = typeof window !== "undefined"
      ? window.location.origin
      : undefined,
    allowedLinkPrefixes = ALLOWED_LINK_PREFIXES,
    allowedImagePrefixes = ALLOWED_IMAGE_PREFIXES,
    ...props
  }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
      defaultOrigin={defaultOrigin}
      allowedLinkPrefixes={allowedLinkPrefixes}
      allowedImagePrefixes={allowedImagePrefixes}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";

export default Response;
