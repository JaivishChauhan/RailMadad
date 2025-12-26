import React, { useState, useEffect } from "react";
import { X, Key } from "lucide-react";

/**
 * A popup that appears once to instruct the user to add API keys.
 * Uses localStorage to track if it has been shown.
 */
const ApiKeyPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem("hasSeenApiKeyPopup");
    if (!hasSeenPopup) {
      // Small delay to ensure it appears after initial load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("hasSeenApiKeyPopup", "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-blue-600 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Key className="h-5 w-5" />
            <h3 className="font-bold text-lg">Important Setup</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-blue-700 rounded-full p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
            Welcome to RailMadad AI! To enable full functionality including the
            AI chatbot and smart features, please add your API keys.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 mb-6 rounded-r">
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
              Go to the <span className="font-bold">Superadmin Panel</span> to
              configure your API keys.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
          >
            Got it, I'll add them
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyPopup;
