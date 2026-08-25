"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Streamdown } from "streamdown";

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
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = "Response";

export default Response;
