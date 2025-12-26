import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "./hooks/useAdminAuth";
import { usePassengerAuth } from "./hooks/usePassengerAuth";
import { ComplaintProvider } from "./hooks/useComplaints";
import { initializeStationsDatabase } from "./data/stationsData";
import { initializeTrainsDatabase } from "./data/trainsData";
import { initializeLocalAuth } from "./services/localAuthService";
// Initialize logging configuration
import "./utils/logger";
// Silence console by default to prevent spam
import "./utils/silenceConsole";
import PublicLayout from "./components/layout/PublicLayout";
import AppLoader from "./components/ui/AppLoader";
// SessionDebugPanel removed
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import PassengerLoginPage from "./pages/PassengerLoginPage";
import PassengerRegisterPage from "./pages/PassengerRegisterPage";
import AdminRegisterPage from "./pages/AdminRegisterPage";
import SubmitComplaintPage from "./pages/passenger/SubmitComplaintPage";
import ComplaintStatusPage from "./pages/passenger/ComplaintStatusPage";
import ComplaintDetailPage from "./pages/passenger/ComplaintDetailPage";
import EditComplaintPage from "./pages/passenger/EditComplaintPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminComplaintDetailPage from "./pages/admin/AdminComplaintDetailPage";
import RailAnubhavPage from "./pages/RailAnubhavPage";
import FaqPage from "./pages/FaqPage";
import TrackComplaintPage from "./pages/passenger/TrackComplaintPage";
import SuggestionsPage from "./pages/passenger/SuggestionsPage";
import { Role } from "./types";
// Duplicate imports removed
import { MaintenanceScreen } from "./components/ui/MaintenanceScreen";
import PrototypeDisclaimerPopup from "./components/PrototypeDisclaimerPopup";
import ApiKeyPopup from "./components/ApiKeyPopup";

// Route guards
const PassengerRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, loading } = usePassengerAuth();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }
  return user && user.role === Role.PASSENGER ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/passenger-login"
      replace
      state={{ from: { pathname: window.location.pathname } }}
    />
  );
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }
  return user &&
    (user.role === Role.OFFICIAL ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.MODERATOR) ? (
    <>{children}</>
  ) : (
    <Navigate
      to="/admin-login"
      replace
      state={{ from: { pathname: window.location.pathname } }}
    />
  );
};

// Footer moved to src/components/layout/Footer.tsx

const App: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(
    null
  );
  const location = useLocation();

  useEffect(() => {
    // Initialize the railway stations and trains databases when app starts
    const initializeDatabases = async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.log("Initializing railway data...");
        }
        await initializeStationsDatabase();
        if (process.env.NODE_ENV === "development") {
          console.log("Stations database initialized successfully.");
        }
        await initializeTrainsDatabase();
        if (process.env.NODE_ENV === "development") {
          console.log("Trains database initialized successfully.");
          console.log("Railway data initialization complete.");
        }

        // Initialize local authentication service
        if (process.env.NODE_ENV === "development") {
          console.log("Initializing local authentication...");
        }
        initializeLocalAuth();
        if (process.env.NODE_ENV === "development") {
          console.log("Local authentication setup complete.");
        }
        // Artificial delay to ensure loader is visible - For production remove this
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize railway data:", error);
        setInitializationError(
          "Failed to initialize application data. Please try again later."
        );
        setIsInitializing(false);
      }
    };

    if (process.env.NODE_ENV === "development") {
      console.log("App component mounted");
    }
    initializeDatabases().catch((error) => {
      console.error("Database initialization failed:", error);
      setInitializationError("A critical error occurred during startup.");
      setIsInitializing(false);
    });

    // Event listeners for chat removed - moved to PublicLayout
  }, []);

  useEffect(() => {
    const checkMaintenance = () => {
      const isMaintenance =
        localStorage.getItem("RAILMADAD_MAINTENANCE_MODE") === "true";
      setMaintenanceMode(isMaintenance);
    };
    checkMaintenance();
    window.addEventListener("storage", checkMaintenance);
    return () => window.removeEventListener("storage", checkMaintenance);
  }, []);

  // Check if current path is an admin path - use React Router's location for reactivity
  const isAdminPath =
    location.pathname.startsWith("/admin-login") ||
    location.pathname.startsWith("/dashboard");

  // Show maintenance screen only for non-admin paths
  if (maintenanceMode && !isAdminPath) {
    return <MaintenanceScreen />;
  }

  if (isInitializing) {
    return (
      <AppLoader
        message="Initializing RailMadad..."
        subMessage="Loading necessary resources, please wait."
        showLogo={true}
      />
    );
  }

  if (initializationError) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 p-4">
        <div className="text-center p-6 sm:p-8 border border-red-200 rounded-lg bg-white shadow-md max-w-xs sm:max-w-sm w-full">
          <img
            src="/favicon/RMLogo.png"
            alt="RailMadad"
            className="h-16 mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-red-700 mb-2">
            Application Error
          </h2>
          <p className="text-red-600">{initializationError}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrototypeDisclaimerPopup />
      <ApiKeyPopup />
      <Routes>
        {/* Admin Routes - Full Screen, No Public Layout */}
        <Route path="/admin-login" element={<AdminLoginPage />} />
        <Route path="/admin-register" element={<AdminRegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ComplaintProvider>
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            </ComplaintProvider>
          }
        />
        <Route
          path="/dashboard/complaint/:id"
          element={
            <ComplaintProvider>
              <AdminRoute>
                <AdminComplaintDetailPage />
              </AdminRoute>
            </ComplaintProvider>
          }
        />

        {/* Public Routes - Wrapped in PublicLayout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/track-concern"
            element={
              <ComplaintProvider>
                <TrackComplaintPage />
              </ComplaintProvider>
            }
          />
          <Route
            path="/track-concern/result/:id"
            element={
              <ComplaintProvider>
                <ComplaintDetailPage />
              </ComplaintProvider>
            }
          />
          <Route path="/passenger-login" element={<PassengerLoginPage />} />
          <Route
            path="/passenger-register"
            element={<PassengerRegisterPage />}
          />
          <Route
            path="/submit"
            element={
              <ComplaintProvider>
                <PassengerRoute>
                  <SubmitComplaintPage />
                </PassengerRoute>
              </ComplaintProvider>
            }
          />
          <Route
            path="/suggestions"
            element={
              <ComplaintProvider>
                <PassengerRoute>
                  <SuggestionsPage />
                </PassengerRoute>
              </ComplaintProvider>
            }
          />
          <Route
            path="/status"
            element={
              <ComplaintProvider>
                <PassengerRoute>
                  <ComplaintStatusPage />
                </PassengerRoute>
              </ComplaintProvider>
            }
          />
          <Route
            path="/status/:id"
            element={
              <ComplaintProvider>
                <PassengerRoute>
                  <ComplaintDetailPage />
                </PassengerRoute>
              </ComplaintProvider>
            }
          />
          <Route
            path="/edit-complaint/:id"
            element={
              <ComplaintProvider>
                <PassengerRoute>
                  <EditComplaintPage />
                </PassengerRoute>
              </ComplaintProvider>
            }
          />
          <Route
            path="/rail-anubhav"
            element={
              <ComplaintProvider>
                <RailAnubhavPage />
              </ComplaintProvider>
            }
          />
          <Route path="/faq" element={<FaqPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      {/* Debug panel removed in demo to avoid covering UI */}

      {/* Debug panel for session troubleshooting */}
      {/* Debug panel removed */}

      {/* Debug panel for session troubleshooting */}
      {/* Debug panel removed */}
    </>
  );
};

export default App;
