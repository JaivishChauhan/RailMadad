import React, { useRef, useEffect } from "react";

interface AppLoaderProps {
  message?: string;
  subMessage?: string;
  showLogo?: boolean;
  /** Playback speed multiplier for the animation (e.g., 1.8 = 80% faster) */
  speed?: number;
}

/**
 * Full-screen app loader that shows the RailMadad animated logo.
 * Uses a short WebM video for small size and smooth playback, and sets playbackRate for speed.
 *
 * @param speed - Playback speed multiplier (default: 1.8)
 */
const AppLoader: React.FC<AppLoaderProps> = ({
  message = "Loading...",
  subMessage,
  showLogo = true,
  speed = 1.0,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      try {
        videoRef.current.playbackRate = speed;
      } catch (e) {
        // Some browsers may disallow setting playbackRate before playback starts
        // We'll ignore errors silently and rely on default playback if necessary
      }
    }
  }, [speed]);

  return (
    <div className="fixed inset-0 flex flex-col justify-center items-center bg-gradient-to-br from-gray-300 via-gray-600 to-gray-300 bg-[length:400%_400%] animate-gradient z-[9999]">
      {/* Animated Logo */}
      {showLogo && (
        <video
          ref={videoRef}
          src="/favicon/RM.webm"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/favicon/RM.gif"
          className="h-16 sm:h-20 md:h-24 mb-6 drop-shadow-lg object-contain"
        />
      )}

      {/* SVG Letter Animation */}
      <div className="flex flex-wrap justify-center items-center max-w-[90vw] scale-[clamp(0.4,10vw,1.2)]">
        {/* Gradient Definition */}
        <svg height="0" width="0" viewBox="0 0 64 64" className="absolute">
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              y2="2"
              x2="0"
              y1="62"
              x1="0"
              id="maroon-gradient"
            >
              <stop stopColor="#800000" />
              <stop stopColor="#8B0000" offset="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* R */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M12 4v56M12 4h24a16 16 0 0 1 0 32H12M36 36l16 24"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* A */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M32 4L4 60M32 4l28 56M16 40h32"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* I */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M32 4v56M12 4h40M12 60h40"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* L */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M14 4v56h40"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* M */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M8 60V4l24 28 24-28v56"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* A */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M32 4L4 60M32 4l28 56M16 40h32"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* D */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M12 60V4h20a28 28 0 0 1 0 56H12z"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* A */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M32 4L4 60M32 4l28 56M16 40h32"
            className="animate-dash"
            pathLength={360}
          />
        </svg>

        {/* D */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 64 64"
          height="64"
          width="64"
        >
          <path
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeWidth="8"
            stroke="url(#maroon-gradient)"
            d="M12 60V4h20a28 28 0 0 1 0 56H12z"
            className="animate-dash"
            pathLength={360}
          />
        </svg>
      </div>

      {/* Loading Text */}
      <div className="mt-8 text-center">
        <p className="text-lg sm:text-xl font-semibold text-[#75002b] drop-shadow-sm">
          {message}
        </p>
        {subMessage && (
          <p className="text-sm sm:text-base text-[#75002b]/80 mt-1">
            {subMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default AppLoader;
