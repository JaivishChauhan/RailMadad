import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Password input component with visibility toggle.
 * Allows users to reveal/hide their password for verification.
 *
 * @param className - Additional CSS classes to merge with defaults.
 * @param props - Standard HTML input attributes (excluding type).
 * @param ref - Forwarded ref for DOM access.
 * @returns A styled password input with reveal button.
 */
export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Custom class for the wrapper div */
  wrapperClassName?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, wrapperClassName, disabled, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    /**
     * Toggles the password visibility state.
     * When visible, shows plain text; otherwise, shows masked characters.
     */
    const toggleVisibility = () => {
      setIsVisible((prev) => !prev);
    };

    return (
      <div className={cn("relative", wrapperClassName)}>
        <input
          type={isVisible ? "text" : "password"}
          className={cn(
            "flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 pr-10 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 md:text-sm",
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggleVisibility}
          disabled={disabled}
          aria-label={isVisible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {isVisible ? (
            <EyeOff
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
