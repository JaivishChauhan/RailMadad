import React, { useState, useEffect } from "react";
import { X, AlertTriangle, FlaskConical } from "lucide-react";

/**
 * localStorage key used to track if the disclaimer has been shown.
 */
const DISCLAIMER_SHOWN_KEY = "hasSeenPrototypeDisclaimer";

/**
 * A one-time popup that displays a prototype disclaimer to users.
 * Explains that this is a demonstrative build from a past hackathon project.
 *
 * @returns {JSX.Element | null} The disclaimer popup or null if already dismissed.
 */
const PrototypeDisclaimerPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem(DISCLAIMER_SHOWN_KEY);
    if (!hasSeenDisclaimer) {
      // Show immediately on first load (before other popups)
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  /**
   * Handles closing the popup and persists the dismissal to localStorage.
   */
  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(DISCLAIMER_SHOWN_KEY, "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-amber-300 dark:border-amber-600 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <FlaskConical className="h-5 w-5" />
            <h3 className="font-bold text-lg">Prototype Disclaimer</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-amber-600 rounded-full p-1 transition-colors"
            aria-label="Close disclaimer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                This is a <strong>demonstrative build</strong> of a past{" "}
                <span className="font-semibold text-amber-600">
                  Smart India Hackathon
                </span>{" "}
                project. It has been partially refactored to highlight the core
                logic and backend architecture, but remains an{" "}
                <strong>experimental prototype</strong> provided "as-is."
              </p>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 mb-6 rounded-r space-y-2">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              While critical paths have been patched for demonstration, you may
              encounter:
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-400 list-disc list-inside space-y-1">
              <li>Bugs and unexpected behavior</li>
              <li>Unoptimized workflows</li>
              <li>Responsive layout issues</li>
            </ul>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-2 font-medium">
              This project is intended for{" "}
              <span className="underline">
                archival and portfolio purposes only
              </span>{" "}
              and is not optimized for user experience or commercial deployment.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-lg transition-all shadow-md hover:shadow-lg active:transform active:scale-[0.98]"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrototypeDisclaimerPopup;
