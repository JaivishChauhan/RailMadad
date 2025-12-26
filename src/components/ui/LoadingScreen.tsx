import React from "react";

interface LoadingScreenProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  description?: string;
  showAnimation?: boolean;
  className?: string;
}

/**
 * A loading screen component that displays the animated RailMadad logo GIF.
 *
 * @param size - Controls the size of the loading indicator ('sm', 'md', 'lg')
 * @param message - Optional message to display below the loader
 * @param description - Optional secondary description text
 * @param showAnimation - Whether to show additional bounce animation dots
 * @param className - Additional CSS classes for the container
 * @returns A centered loading screen with animated logo
 */
export const LoadingScreen: React.FC<
  LoadingScreenProps & { speed?: number }
> = ({
  size = "md",
  message,
  description,
  showAnimation = false,
  className = "",
  speed = 1.0,
}) => {
  const sizeClasses = {
    sm: "h-12 w-12",
    md: "h-24 w-24",
    lg: "h-40 w-40",
  };

  const containerClasses = {
    sm: "py-4",
    md: "py-12",
    lg: "py-16",
  };

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  React.useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = speed;
      } catch (e) {
        // ignore
      }
    }
  }, [speed]);

  return (
    <div
      className={`flex items-center justify-center ${containerClasses[size]} ${className}`}
    >
      <div className="flex flex-col items-center justify-center">
        <video
          ref={videoRef}
          src="/favicon/RM.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/favicon/RM.gif"
          className={`${sizeClasses[size]} object-contain`}
        />
        {message && (
          <p className="text-sm text-primary font-semibold mt-2">{message}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {showAnimation && (
          <div className="mt-4 flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-0"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-150"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-300"></div>
          </div>
        )}
      </div>
    </div>
  );
};
