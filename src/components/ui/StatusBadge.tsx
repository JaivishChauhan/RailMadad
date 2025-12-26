import React from "react";
import { Badge as ShadcnBadge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Status } from "../../types";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: Status | string;
}

const statusColors: Record<Status, string> = {
  [Status.REGISTERED]: "bg-gray-100 text-gray-800 border-gray-200",
  [Status.ANALYZING]: "bg-blue-100 text-blue-800 border-blue-200 animate-pulse",
  [Status.ASSIGNED]: "bg-blue-200 text-blue-900 border-blue-300",
  [Status.IN_PROGRESS]: "bg-yellow-100 text-yellow-800 border-yellow-200",
  [Status.ESCALATED]: "bg-orange-200 text-orange-900 border-orange-300",
  [Status.RESOLVED]: "bg-green-100 text-green-800 border-green-200",
  [Status.CLOSED]: "bg-purple-100 text-purple-800 border-purple-200",
  [Status.WITHDRAWN]: "bg-red-100 text-red-800 border-red-200",
  [Status.PENDING]: "bg-yellow-50 text-yellow-700 border-yellow-100",
};

// Status-specific Badge for complaint statuses
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  className = "",
  status,
  children,
  ...props
}) => {
  const isValidStatus =
    status &&
    typeof status === "string" &&
    (Object.values(Status) as string[]).includes(status);
  const colorClass = isValidStatus ? statusColors[status as Status] : "";
  const label = isValidStatus
    ? (status as string).replace("_", " ")
    : typeof status === "string"
    ? status
    : "";

  // If status is provided, use status-specific styling
  if (status) {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          colorClass,
          className
        )}
        {...props}
      >
        {children || label || "N/A"}
      </div>
    );
  }

  // Otherwise, use standard shadcn Badge
  return (
    <ShadcnBadge className={className} {...props}>
      {children}
    </ShadcnBadge>
  );
};

// Re-export shadcn badge utilities for direct use
export { badgeVariants };
