import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import type { Complaint, Media } from "../types";
import { Status, MediaType, ComplaintSource, Priority } from "../types";
import {
  analyzeComplaintWithAI,
  extractComplaintFromChatbotMessage,
} from "../services/geminiService";
import { usePassengerAuth } from "./usePassengerAuth";
import { useAdminAuth } from "./useAdminAuth";

/**
 * localStorage key for persisting complaints data.
 */
const STORAGE_KEY = "railmadad_complaints_data";

/**
 * New complaint data type, excluding auto-generated fields.
 */
type NewComplaintData = Omit<
  Complaint,
  | "id"
  | "title"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "media"
  | "analysis"
  | "assignedTo"
  | "source"
>;

/**
 * Context type for complaint operations.
 */
interface ComplaintContextType {
  complaints: Complaint[];
  loading: boolean;
  addComplaint: (
    complaintData: NewComplaintData,
    mediaFiles: File[]
  ) => Promise<Complaint | null>;
  addChatbotComplaint: (
    complaintSummary: string,
    botResponse: string
  ) => Promise<Complaint | null>;
  addComplaintFromFunctionCall: (
    functionCallArgs: any
  ) => Promise<Complaint | null>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  deleteComplaint: (id: string) => Promise<boolean>;
  takeBackComplaint: (id: string) => Promise<boolean>;
  resubmitComplaint: (
    id: string,
    updatedData: Partial<NewComplaintData>,
    mediaFiles?: File[]
  ) => Promise<boolean>;
  getComplaintById: (id: string) => Complaint | undefined;
  refreshComplaints: () => void;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined
);

/**
 * Generates a unique Complaint Reference Number (CRN) based on complaint area.
 * Format: PREFIX-TIMESTAMP-RANDOM
 * - CMP: Regular complaints (Train, Station issues)
 * - SUG: Suggestions
 * - EXP: Rail Anubhav experiences
 * - ENQ: Enquiries
 *
 * @param {string} [complaintArea] - The area/type of complaint
 * @returns A unique CRN string identifier (e.g., CMP-M1ABC-X2Y3)
 */
const generateId = (complaintArea?: string): string => {
  // Determine prefix based on complaint area
  let prefix = "CMP"; // Default for regular complaints

  if (complaintArea) {
    const area = complaintArea.toUpperCase();
    if (area === "SUGGESTIONS" || area === "SUGGESTION") {
      prefix = "SUG";
    } else if (area === "RAIL_ANUBHAV" || area === "EXPERIENCE") {
      prefix = "EXP";
    } else if (area === "ENQUIRY") {
      prefix = "ENQ";
    }
  }

  // Generate a compact, readable ID
  const timestamp = Date.now().toString(36).toUpperCase().slice(-5);
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);

  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Retrieves complaints from localStorage.
 *
 * @returns Array of persisted complaints, empty if none exist
 */
const getStoredComplaints = (): Complaint[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading complaints from localStorage:", error);
    return [];
  }
};

/**
 * Persists complaints to localStorage.
 *
 * @param complaints - The complaints array to persist
 */
const saveComplaints = (complaints: Complaint[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  } catch (error) {
    console.error("Error saving complaints to localStorage:", error);
  }
};

/**
 * Converts a File to a Base64 string for persistence.
 *
 * @param file - The file to process
 * @returns A promise that resolves to the Base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Determines the MediaType based on file MIME type.
 *
 * @param file - The file to check
 * @returns The corresponding MediaType enum value
 */
const getMediaType = (file: File): MediaType => {
  if (file.type.startsWith("image")) return MediaType.IMAGE;
  if (file.type.startsWith("video")) return MediaType.VIDEO;
  return MediaType.AUDIO;
};

/**
 * ComplaintProvider component that manages complaint state using localStorage.
 * Provides CRUD operations for complaints with optional AI analysis.
 *
 * @param children - React children components
 */
export const ComplaintProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Support both passenger and admin authentication
  const { user: passengerUser } = usePassengerAuth();
  const { user: adminUser } = useAdminAuth();

  // Determine the current user and role
  const user = passengerUser || adminUser;
  const isAdmin = !!adminUser;
  const isPassenger = !!passengerUser;

  // Debug logging for authentication state
  useEffect(() => {
    console.log("🔍 useComplaintsLocal auth state:", {
      passengerUser: passengerUser?.email || "none",
      adminUser: adminUser?.email || "none",
      isAdmin,
      isPassenger,
      currentUser: user?.email || "none",
    });
  }, [passengerUser, adminUser, isAdmin, isPassenger, user]);

  // Persist complaints to localStorage whenever they change - REMOVED to prevent data loss
  // The state modifiers (addComplaint, updateComplaint, etc.) handle persistence directly
  // preserving other users' data.
  /*
  useEffect(() => {
    if (complaints.length > 0 || !loading) {
      saveComplaints(complaints);
    }
  }, [complaints, loading]);
  */

  /**
   * Refreshes complaints from localStorage.
   * For admins, shows all complaints. For passengers, filters by user.
   */
  const refreshComplaints = useCallback(() => {
    setLoading(true);
    try {
      const storedComplaints = getStoredComplaints();

      if (isAdmin) {
        // Admins see all complaints
        setComplaints(storedComplaints);
      } else if (isPassenger && user) {
        // Passengers only see their own complaints (by email match)
        const userComplaints = storedComplaints.filter(
          (c) => c.userEmail === user.email
        );
        setComplaints(userComplaints);
      } else {
        setComplaints([]);
      }
    } catch (error) {
      console.error("Error refreshing complaints:", error);
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, isPassenger]);

  // Load complaints on mount and when user changes
  useEffect(() => {
    refreshComplaints();
  }, [refreshComplaints]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        console.log("🔄 Storage change detected, refreshing complaints...");
        refreshComplaints();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshComplaints]);

  /**
   * Adds a new complaint from the submission form.
   *
   * @param complaintData - The complaint details
   * @param mediaFiles - Optional array of media files to attach
   * @returns The created complaint or null if failed
   */
  const addComplaint = useCallback(
    async (
      complaintData: NewComplaintData,
      mediaFiles: File[]
    ): Promise<Complaint | null> => {
      // Allow Guest (no user) or Passenger. Block Admin.
      if (user && !isPassenger) {
        console.error("Admins cannot submit complaints via this flow");
        return null;
      }

      try {
        const id = generateId(complaintData.complaintArea);
        const now = new Date().toISOString();

        // Process media files
        const media: Media[] = [];
        if (mediaFiles && mediaFiles.length > 0) {
          for (const file of mediaFiles) {
            try {
              const url = await fileToBase64(file);
              media.push({
                id: `${id}-${file.name}`,
                name: file.name,
                type: getMediaType(file),
                url,
              });
            } catch (error) {
              console.error(`Failed to process file ${file.name}:`, error);
            }
          }
        }

        // Generate title with fallbacks
        const titleType = complaintData.complaintType || "General";
        const titleSubType = complaintData.complaintSubType || "Complaint";

        const complaint: Complaint = {
          id,
          title: `${titleType}: ${titleSubType}`,
          description: complaintData.description,
          complaintArea: complaintData.complaintArea,
          complaintType: titleType,
          complaintSubType: complaintData.complaintSubType,
          incidentDate: complaintData.incidentDate,
          incidentTime: complaintData.incidentTime,
          location: (complaintData as any).location || "",
          trainNumber: (complaintData as any).trainNumber,
          trainName: (complaintData as any).trainName,
          pnr: (complaintData as any).pnr,
          utsNumber: (complaintData as any).utsNumber,
          coachNumber: (complaintData as any).coachNumber,
          seatNumber: (complaintData as any).seatNumber,
          journeyDate: (complaintData as any).journeyDate,
          stationCode: (complaintData as any).stationCode,
          stationName: (complaintData as any).stationName,
          nearestStation: complaintData.nearestStation,
          platformNumber: (complaintData as any).platformNumber,
          unauthorizedPeopleCount: complaintData.unauthorizedPeopleCount,
          declaration: complaintData.declaration,
          consentShare: complaintData.consentShare,
          mobileNumber: complaintData.mobileNumber,
          status: Status.REGISTERED,
          priority: Priority.MEDIUM,
          source: ComplaintSource.FORM,
          assignedTo: undefined,
          createdAt: now,
          updatedAt: now,
          media,
          userEmail: user?.email || "anonymous", // Associate complaint with user for filtering
        };

        // Update state with new complaint
        setComplaints((prev) => {
          const allComplaints = getStoredComplaints();
          const updated = [complaint, ...allComplaints];
          saveComplaints(updated);
          return [complaint, ...prev];
        });

        // Run AI analysis in background
        setTimeout(async () => {
          try {
            const analysisData = await analyzeComplaintWithAI(complaint);
            setComplaints((prev) => {
              const updated = prev.map((c) =>
                c.id === id
                  ? {
                    ...c,
                    status: Status.IN_PROGRESS,
                    assignedTo:
                      analysisData.suggestedDepartment || "Customer Service",
                    updatedAt: new Date().toISOString(),
                    analysis: {
                      id: `analysis-${id}`,
                      complaintId: id,
                      category: analysisData.category,
                      urgencyScore: analysisData.urgencyScore,
                      summary: analysisData.summary,
                      keywords: analysisData.keywords,
                      suggestedDepartment: analysisData.suggestedDepartment,
                      analysisTimestamp: new Date().toISOString(),
                    },
                  }
                  : c
              );

              // Persist the analyzed complaint
              const allComplaints = getStoredComplaints();
              const mergedComplaints = allComplaints.map((stored) => {
                const updatedVersion = updated.find((u) => u.id === stored.id);
                return updatedVersion || stored;
              });
              saveComplaints(mergedComplaints);

              return updated;
            });
          } catch (e) {
            console.error("Error in AI analysis:", e);
          }
        }, 800);

        return complaint;
      } catch (error) {
        console.error("Error adding complaint:", error);
        return null;
      }
    },
    [user, isPassenger]
  );

  /**
   * Adds a complaint extracted from chatbot conversation.
   *
   * @param complaintSummary - Summary of the complaint from chat
   * @param botResponse - The bot's response for context
   * @returns The created complaint or null if failed
   */
  const addChatbotComplaint = useCallback(
    async (
      complaintSummary: string,
      botResponse: string
    ): Promise<Complaint | null> => {
      if (!user) {
        console.error("User not authenticated");
        return null;
      }

      if (!isPassenger) {
        console.error("Only passengers can submit complaints via chatbot");
        return null;
      }

      try {
        const extractedData = await extractComplaintFromChatbotMessage(
          complaintSummary,
          botResponse
        );
        if (
          !extractedData ||
          !extractedData.description ||
          !extractedData.complaintArea
        ) {
          return null;
        }

        const id = generateId(extractedData.complaintArea);
        const now = new Date().toISOString();

        // Generate title with fallbacks
        const titleType = extractedData.complaintType || "General";
        const titleSubType = extractedData.complaintSubType || "Complaint";

        const complaint: Complaint = {
          id,
          title: `${titleType}: ${titleSubType}`,
          description: extractedData.description,
          complaintArea: extractedData.complaintArea,
          complaintType: titleType,
          complaintSubType: titleSubType,
          incidentDate: extractedData.incidentDate || new Date().toISOString(),
          incidentTime: extractedData.incidentTime,
          location: (extractedData as any).location || "",
          trainNumber: (extractedData as any).trainNumber,
          trainName: (extractedData as any).trainName,
          pnr: (extractedData as any).pnr,
          utsNumber: (extractedData as any).utsNumber,
          coachNumber: (extractedData as any).coachNumber,
          seatNumber: (extractedData as any).seatNumber,
          journeyDate: (extractedData as any).journeyDate,
          stationCode: (extractedData as any).stationCode,
          stationName: (extractedData as any).stationName,
          nearestStation: extractedData.nearestStation,
          unauthorizedPeopleCount: extractedData.unauthorizedPeopleCount,
          mobileNumber: extractedData.mobileNumber,
          status: Status.REGISTERED,
          priority: Priority.MEDIUM,
          source: ComplaintSource.CHATBOT,
          assignedTo: undefined,
          createdAt: now,
          updatedAt: now,
          media: [],
          userEmail: user.email, // Associate complaint with user for filtering
        };

        // Update state and persist
        setComplaints((prev) => {
          const allComplaints = getStoredComplaints();
          const updated = [complaint, ...allComplaints];
          saveComplaints(updated);
          return [complaint, ...prev];
        });

        return complaint;
      } catch (error) {
        console.error("Error adding chatbot complaint:", error);
        return null;
      }
    },
    [user, isPassenger]
  );

  /**
   * Adds a complaint from a function call (used by the chatbot).
   * Creates a complaint directly from parsed function call arguments.
   *
   * @param functionCallArgs - The parsed arguments from the AI function call
   * @returns The created complaint or null if failed
   */
  const addComplaintFromFunctionCall = useCallback(
    async (functionCallArgs: any): Promise<Complaint | null> => {
      if (!user) {
        console.error("User not authenticated");
        return null;
      }

      try {
        const id = generateId(functionCallArgs.complaintArea);
        const now = new Date().toISOString();
        const today = new Date().toISOString().split("T")[0];

        // Generate title with fallbacks
        const titleType = functionCallArgs.complaintType || "General";
        const titleSubType = functionCallArgs.complaintSubType || "Complaint";

        const complaint: Complaint = {
          id,
          title: `${titleType}: ${titleSubType}`,
          description:
            functionCallArgs.description || "No description provided",
          complaintArea: functionCallArgs.complaintArea || "TRAIN",
          complaintType: titleType,
          complaintSubType: titleSubType,
          incidentDate: functionCallArgs.incidentDate || today,
          incidentTime: functionCallArgs.incidentTime,
          location: functionCallArgs.location || "",
          trainNumber: functionCallArgs.trainNumber,
          trainName: functionCallArgs.trainName,
          pnr: functionCallArgs.pnr,
          utsNumber: functionCallArgs.utsNumber,
          coachNumber: functionCallArgs.coachNumber,
          seatNumber: functionCallArgs.seatNumber,
          journeyDate: functionCallArgs.journeyDate,
          stationCode: functionCallArgs.stationCode,
          stationName: functionCallArgs.stationName,
          nearestStation: functionCallArgs.nearestStation,
          platformNumber: functionCallArgs.platformNumber,
          unauthorizedPeopleCount: functionCallArgs.unauthorizedPeopleCount,
          mobileNumber: functionCallArgs.mobileNumber,
          status: Status.REGISTERED,
          priority: Priority.MEDIUM,
          source: ComplaintSource.CHATBOT,
          assignedTo: undefined,
          createdAt: now,
          updatedAt: now,
          media: [],
          userEmail: user.email, // Associate complaint with user for filtering
        };

        // Update state and persist
        setComplaints((prev) => {
          const allComplaints = getStoredComplaints();
          const updated = [complaint, ...allComplaints];
          saveComplaints(updated);
          return [complaint, ...prev];
        });

        // Run AI analysis in background
        setTimeout(async () => {
          try {
            const analysisData = await analyzeComplaintWithAI(complaint);
            setComplaints((prev) => {
              const updated = prev.map((c) =>
                c.id === id
                  ? {
                    ...c,
                    status: Status.IN_PROGRESS,
                    assignedTo:
                      analysisData.suggestedDepartment || "Customer Service",
                    updatedAt: new Date().toISOString(),
                    analysis: {
                      id: `analysis-${id}`,
                      complaintId: id,
                      category: analysisData.category,
                      urgencyScore: analysisData.urgencyScore,
                      summary: analysisData.summary,
                      keywords: analysisData.keywords,
                      suggestedDepartment: analysisData.suggestedDepartment,
                      analysisTimestamp: new Date().toISOString(),
                    },
                  }
                  : c
              );

              // Persist the analyzed complaint
              const allComplaints = getStoredComplaints();
              const mergedComplaints = allComplaints.map((stored) => {
                const updatedVersion = updated.find((u) => u.id === stored.id);
                return updatedVersion || stored;
              });
              saveComplaints(mergedComplaints);

              return updated;
            });
          } catch (e) {
            console.error("Error in AI analysis (function call):", e);
          }
        }, 800);

        return complaint;
      } catch (error) {
        console.error("Error adding function call complaint:", error);
        return null;
      }
    },
    [user]
  );

  /**
   * Updates an existing complaint.
   *
   * @param id - The ID of the complaint to update
   * @param updates - Partial complaint data to merge
   */
  const updateComplaint = useCallback(
    async (id: string, updates: Partial<Complaint>): Promise<void> => {
      if (!user) return;

      try {
        setComplaints((prev) => {
          const updated = prev.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: new Date().toISOString() }
              : c
          );

          // Persist to localStorage
          const allComplaints = getStoredComplaints();
          const mergedComplaints = allComplaints.map((stored) => {
            const updatedVersion = updated.find((u) => u.id === stored.id);
            return updatedVersion || stored;
          });
          saveComplaints(mergedComplaints);

          return updated;
        });
      } catch (error) {
        console.error("Error in updateComplaint:", error);
      }
    },
    [user]
  );

  /**
   * Deletes a complaint.
   *
   * @param id - The ID of the complaint to delete
   * @returns True if successful, false otherwise
   */
  const deleteComplaint = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) return false;

      try {
        setComplaints((prev) => {
          const updated = prev.filter((c) => c.id !== id);

          // Persist to localStorage
          const allComplaints = getStoredComplaints();
          const filteredComplaints = allComplaints.filter((c) => c.id !== id);
          saveComplaints(filteredComplaints);

          return updated;
        });
        return true;
      } catch (error) {
        console.error("Error in deleteComplaint:", error);
        return false;
      }
    },
    [user]
  );

  /**
   * Takes back (withdraws) a complaint.
   * Only works for complaints in REGISTERED or ANALYZING status.
   *
   * @param id - The ID of the complaint to withdraw
   * @returns True if successful, false otherwise
   */
  const takeBackComplaint = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user) {
        console.error("User not authenticated");
        return false;
      }

      try {
        setComplaints((prev) => {
          const updated = prev.map((c) =>
            c.id === id
              ? {
                ...c,
                status: Status.WITHDRAWN,
                updatedAt: new Date().toISOString(),
              }
              : c
          );

          // Persist to localStorage
          const allComplaints = getStoredComplaints();
          const mergedComplaints = allComplaints.map((stored) => {
            const updatedVersion = updated.find((u) => u.id === stored.id);
            return updatedVersion || stored;
          });
          saveComplaints(mergedComplaints);

          return updated;
        });
        console.log("✅ Complaint taken back successfully");
        return true;
      } catch (error) {
        console.error("Error in takeBackComplaint:", error);
        return false;
      }
    },
    [user]
  );

  /**
   * Resubmits a withdrawn complaint with updated data.
   * Resets the status to REGISTERED.
   *
   * @param id - The ID of the complaint to resubmit
   * @param updatedData - The partial data to update
   * @param mediaFiles - Optional new media files to add
   * @returns True if successful, false otherwise
   */
  const resubmitComplaint = useCallback(
    async (
      id: string,
      updatedData: Partial<NewComplaintData>,
      mediaFiles: File[] = []
    ): Promise<boolean> => {
      if (!user) {
        console.error("User not authenticated");
        return false;
      }

      try {
        // Handle new media files
        const newMedia: Media[] = [];
        if (mediaFiles && mediaFiles.length > 0) {
          for (const file of mediaFiles) {
            try {
              const url = await fileToBase64(file);
              newMedia.push({
                id: `${id}-${file.name}`,
                name: file.name,
                type: getMediaType(file),
                url,
              });
            } catch (error) {
              console.error(`Failed to process file ${file.name}:`, error);
            }
          }
        }

        setComplaints((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== id) return c;
            return {
              ...c,
              ...updatedData,
              status: Status.REGISTERED,
              updatedAt: new Date().toISOString(),
              media: newMedia.length > 0 ? [...c.media, ...newMedia] : c.media,
              analysis: undefined, // Reset analysis for resubmission
            };
          });

          // Persist to localStorage
          const allComplaints = getStoredComplaints();
          const mergedComplaints = allComplaints.map((stored) => {
            const updatedVersion = updated.find((u) => u.id === stored.id);
            return updatedVersion || stored;
          });
          saveComplaints(mergedComplaints);

          return updated;
        });

        // Trigger new AI analysis
        setTimeout(async () => {
          try {
            const complaint = complaints.find((c) => c.id === id);
            if (complaint) {
              const analysisData = await analyzeComplaintWithAI(complaint);
              setComplaints((prev) => {
                const updated = prev.map((c) =>
                  c.id === id
                    ? {
                      ...c,
                      status: Status.IN_PROGRESS,
                      assignedTo:
                        analysisData.suggestedDepartment ||
                        "Customer Service",
                      updatedAt: new Date().toISOString(),
                      analysis: {
                        id: `analysis-${id}`,
                        complaintId: id,
                        category: analysisData.category,
                        urgencyScore: analysisData.urgencyScore,
                        summary: analysisData.summary,
                        keywords: analysisData.keywords,
                        suggestedDepartment: analysisData.suggestedDepartment,
                        analysisTimestamp: new Date().toISOString(),
                      },
                    }
                    : c
                );

                // Persist analyzed complaint
                const allComplaints = getStoredComplaints();
                const mergedComplaints = allComplaints.map((stored) => {
                  const updatedVersion = updated.find(
                    (u) => u.id === stored.id
                  );
                  return updatedVersion || stored;
                });
                saveComplaints(mergedComplaints);

                return updated;
              });
            }
          } catch (e) {
            console.error("Error in AI analysis (resubmit):", e);
          }
        }, 800);

        console.log("✅ Complaint resubmitted successfully");
        return true;
      } catch (error) {
        console.error("Error in resubmitComplaint:", error);
        return false;
      }
    },
    [user, complaints]
  );

  /**
   * Retrieves a complaint by its ID.
   *
   * @param id - The ID of the complaint to find
   * @returns The complaint if found, undefined otherwise
   */
  const getComplaintById = useCallback(
    (id: string): Complaint | undefined => {
      return complaints.find((complaint) => complaint.id === id);
    },
    [complaints]
  );

  return (
    <ComplaintContext.Provider
      value={{
        complaints,
        loading,
        addComplaint,
        addChatbotComplaint,
        addComplaintFromFunctionCall,
        updateComplaint,
        deleteComplaint,
        takeBackComplaint,
        resubmitComplaint,
        getComplaintById,
        refreshComplaints,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

/**
 * Hook to access complaint context.
 * Must be used within a ComplaintProvider.
 *
 * @returns The complaint context with all CRUD operations
 * @throws Error if used outside ComplaintProvider
 */
export const useComplaints = () => {
  const context = useContext(ComplaintContext);
  if (context === undefined) {
    throw new Error("useComplaints must be used within a ComplaintProvider");
  }
  return context;
};
