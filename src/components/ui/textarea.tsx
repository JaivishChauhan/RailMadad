import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reusable multi-line text input component with consistent styling.
 * Features visible borders for better form field distinction.
 *
 * @param className - Additional CSS classes to merge with defaults.
 * @param props - Standard HTML textarea attributes.
 * @param ref - Forwarded ref for DOM access.
 * @returns A styled textarea element.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 md:text-sm",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
