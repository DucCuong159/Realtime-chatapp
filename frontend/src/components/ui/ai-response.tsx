"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

const ALLOWED_LINK_PREFIXES = ["https://", "http://", "mailto:"];
const ALLOWED_IMAGE_PREFIXES = ["https://res.cloudinary.com"];

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
        "[&_pre]:p-4 [&_pre]:pb-5 [&_pre]:pl-4 [&_pre]:overflow-x-auto",
        "[&_pre_code]:block [&_pre_code]:pb-2",
        "[&_figure]:overflow-hidden [&_figure]:rounded-xl",
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
