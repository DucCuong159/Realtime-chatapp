"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { harden } from "rehype-harden";
import { defaultRehypePlugins, Streamdown } from "streamdown";
import type { PluggableList } from "unified";

const ALLOWED_LINK_PREFIXES = ["https://", "http://", "mailto:"];
const ALLOWED_IMAGE_PREFIXES = ["https://res.cloudinary.com"];

const rehypePlugins: PluggableList = [
  defaultRehypePlugins.raw,
  defaultRehypePlugins.sanitize,
  [
    harden,
    {
      defaultOrigin:
        typeof window !== "undefined" ? window.location.origin : undefined,
      allowedLinkPrefixes: ALLOWED_LINK_PREFIXES,
      allowedImagePrefixes: ALLOWED_IMAGE_PREFIXES,
      allowedProtocols: ["http", "https", "mailto"],
      allowDataImages: false,
    },
  ],
];

type ResponseProps = ComponentProps<typeof Streamdown>;

const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_pre]:p-4 [&_pre]:pb-5 [&_pre]:pl-4 [&_pre]:overflow-x-auto",
        "[&_pre_code]:block [&_pre_code]:pb-2",
        "[&_figure]:overflow-hidden [&_figure]:rounded-xl",
        className,
      )}
      rehypePlugins={rehypePlugins}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";

export default Response;
