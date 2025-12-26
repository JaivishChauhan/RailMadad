import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reusable text input component with consistent styling.
 * Features visible borders for better form field distinction.
 *
 * @param className - Additional CSS classes to merge with defaults.
 * @param type - HTML input type (text, email, password, etc.).
 * @param props - Standard HTML input attributes.
 * @param ref - Forwarded ref for DOM access.
 * @returns A styled input element.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
