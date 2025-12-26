import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import type {
  Complaint as SupabaseComplaint,
  ComplaintAttachment,
} from "../lib/supabase";
import type { Complaint, AnalysisResult, Media } from "../types";
import { Status, MediaType, ComplaintSource } from "../types";
import {
  analyzeComplaintWithAI,
  extractComplaintFromChatbotMessage,
  type ExtractedComplaintData,
} from "../services/geminiService";
import { usePassengerAuth } from "./usePassengerAuth";

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
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  deleteComplaint: (id: string) => Promise<boolean>;
  getComplaintById: (id: string) => Complaint | undefined;
  refreshComplaints: () => void;
}

const ComplaintContext = createContext<ComplaintContextType | undefined>(
  undefined
);

// Helper function to upload file to Supabase Storage
const uploadFileToStorage = async (
  file: File,
  userId: string,
  complaintId: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/${complaintId}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from("complaint-attachments")
      .upload(fileName, file);

    if (error) {
      console.error("File upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("complaint-attachments")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading file:", error);
    return null;
  }
};

// Helper function to convert Supabase complaint to app complaint format
const convertSupabaseToAppComplaint = async (
  supabaseComplaint: SupabaseComplaint
): Promise<Complaint> => {
  // Fetch attachments for this complaint
  const { data: attachments } = await supabase
    .from("complaint_attachments")
    .select("*")
    .eq("complaint_id", supabaseComplaint.id);

  const media: Media[] = ((attachments as ComplaintAttachment[]) || []).map(
    (attachment) => ({
      id: attachment.id,
      name: attachment.file_name,
      type: attachment.file_type.startsWith("image")
        ? MediaType.IMAGE
        : attachment.file_type.startsWith("video")
        ? MediaType.VIDEO
        : MediaType.AUDIO,
      url: attachment.file_url,
    })
  );

  return {
    id: supabaseComplaint.id,
    title: `${supabaseComplaint.complaint_type}: ${supabaseComplaint.complaint_subtype}`,
    description: supabaseComplaint.description,
    complaintArea: supabaseComplaint.complaint_area as "TRAIN" | "STATION",
    complaintType: supabaseComplaint.complaint_type,
    complaintSubType: supabaseComplaint.complaint_subtype,
    incidentDate: supabaseComplaint.incident_date,
    location: supabaseComplaint.location || "",
    // Train fields - using optional chaining since they may not exist in type
    trainNumber: (supabaseComplaint as any).train_number || undefined,
    trainName: (supabaseComplaint as any).train_name || undefined,
    pnr: (supabaseComplaint as any).pnr || undefined,
    coachNumber: (supabaseComplaint as any).coach_number || undefined,
    seatNumber: (supabaseComplaint as any).seat_number || undefined,
    journeyDate: (supabaseComplaint as any).journey_date || undefined,
    stationCode: (supabaseComplaint as any).station_code || undefined,
    stationName: (supabaseComplaint as any).station_name || undefined,
    status: mapSupabaseStatusToAppStatus(supabaseComplaint.status),
    priority: supabaseComplaint.priority as any,
    source: supabaseComplaint.source as ComplaintSource,
    assignedTo: (supabaseComplaint as any).assigned_to || undefined,
    createdAt: supabaseComplaint.created_at,
    updatedAt: supabaseComplaint.updated_at,
    media,
  };
};

// Helper function to map Supabase status to app status
const mapSupabaseStatusToAppStatus = (supabaseStatus: string): Status => {
  switch (supabaseStatus) {
    case "pending":
      return Status.REGISTERED;
    case "in_progress":
      return Status.IN_PROGRESS;
    case "resolved":
      return Status.RESOLVED;
    case "closed":
      return Status.CLOSED;
    case "escalated":
      return Status.ESCALATED;
    default:
      return Status.REGISTERED;
  }
};

// Helper function to map app status to Supabase status
const mapAppStatusToSupabaseStatus = (appStatus: Status): string => {
  switch (appStatus) {
    case Status.REGISTERED:
      return "pending";
    case Status.ANALYZING:
      return "pending";
    case Status.ASSIGNED:
      return "in_progress";
    case Status.IN_PROGRESS:
      return "in_progress";
    case Status.RESOLVED:
      return "resolved";
    case Status.CLOSED:
      return "closed";
    case Status.ESCALATED:
      return "escalated";
    default:
      return "pending";
  }
};

export const ComplaintProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = usePassengerAuth();

  const refreshComplaints = useCallback(async () => {
    if (!user) {
      setComplaints([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: supabaseComplaints, error } = await supabase
        .from("complaints")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching complaints:", error);
        return;
      }

      if (supabaseComplaints) {
        const appComplaints = await Promise.all(
          (supabaseComplaints as SupabaseComplaint[]).map(
            convertSupabaseToAppComplaint
          )
        );
        setComplaints(appComplaints);
      }
    } catch (error) {
      console.error("Error in refreshComplaints:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshComplaints();
  }, [refreshComplaints]);

  const addComplaint = useCallback(
    async (complaintData: NewComplaintData, mediaFiles: File[]) => {
      if (!user) {
        console.error("User not authenticated");
        return null;
      }

      try {
        // Insert complaint into database
        const { data: newComplaint, error } = await supabase
          .from("complaints")
          .insert({
            user_id: user.id,
            complaint_area: complaintData.complaintArea as "TRAIN" | "STATION",
            train_number: (complaintData as any).trainNumber,
            train_name: (complaintData as any).trainName,
            pnr: (complaintData as any).pnr,
            coach_number: (complaintData as any).coachNumber,
            seat_number: (complaintData as any).seatNumber,
            journey_date: (complaintData as any).journeyDate,
            station_code: (complaintData as any).stationCode,
            station_name: (complaintData as any).stationName,
            incident_date: complaintData.incidentDate,
            incident_time: undefined,
            location: (complaintData as any).location,
            complaint_type: complaintData.complaintType,
            complaint_subtype: complaintData.complaintSubType,
            description: complaintData.description,
            source: "manual",
            status: "pending",
            priority: "medium",
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting complaint:", error);
          return null;
        }

        // Upload media files if any
        if (mediaFiles && mediaFiles.length > 0 && newComplaint) {
          const uploadPromises = mediaFiles.map(async (file) => {
            const fileUrl = await uploadFileToStorage(
              file,
              user.id,
              (newComplaint as SupabaseComplaint).id
            );
            if (fileUrl) {
              return supabase.from("complaint_attachments").insert({
                complaint_id: (newComplaint as SupabaseComplaint).id,
                file_name: file.name,
                file_url: fileUrl,
                file_type: file.type,
                file_size: file.size,
                uploaded_by: user.id,
              });
            }
            return null;
          });

          await Promise.all(uploadPromises);
        }

        // Convert to app format and add to state
        const appComplaint = await convertSupabaseToAppComplaint(
          newComplaint as SupabaseComplaint
        );
        setComplaints((prev) => [appComplaint, ...prev]);

        // Start AI analysis in background
        setTimeout(async () => {
          try {
            // Update status to analyzing
            await supabase
              .from("complaints")
              .update({ status: "in_progress" })
              .eq("id", (newComplaint as SupabaseComplaint).id);

            // Run AI analysis
            const analysisData = await analyzeComplaintWithAI(appComplaint);

            // Update complaint with analysis results (don't auto-assign to departments)
            await supabase
              .from("complaints")
              .update({
                status: "in_progress",
                // Note: assigned_to should only be set to actual official UUIDs, not department names
              })
              .eq("id", (newComplaint as SupabaseComplaint).id);

            // Refresh complaints to get updated data
            refreshComplaints();
          } catch (error) {
            console.error("Error in AI analysis:", error);
          }
        }, 1000);

        return appComplaint;
      } catch (error) {
        console.error("Error adding complaint:", error);
        return null;
      }
    },
    [user, refreshComplaints]
  );

  const addChatbotComplaint = useCallback(
    async (complaintSummary: string, botResponse: string) => {
      if (!user) {
        console.error("User not authenticated");
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

        // Insert complaint into database
        const { data: newComplaint, error } = await supabase
          .from("complaints")
          .insert({
            user_id: user.id,
            complaint_area: extractedData.complaintArea,
            train_number: (extractedData as any).trainNumber,
            train_name: (extractedData as any).trainName,
            pnr: (extractedData as any).pnr,
            coach_number: (extractedData as any).coachNumber,
            seat_number: (extractedData as any).seatNumber,
            journey_date: (extractedData as any).journeyDate,
            station_code: (extractedData as any).stationCode,
            station_name: (extractedData as any).stationName,
            incident_date: extractedData.incidentDate,
            incident_time: undefined,
            location: (extractedData as any).location,
            complaint_type: extractedData.complaintType,
            complaint_subtype: extractedData.complaintSubType,
            description: extractedData.description,
            source: "chatbot",
            status: "pending",
            priority: "medium",
          })
          .select()
          .single();

        if (error) {
          console.error("Error inserting chatbot complaint:", error);
          return null;
        }

        // Convert to app format and add to state
        const appComplaint = await convertSupabaseToAppComplaint(
          newComplaint as SupabaseComplaint
        );
        setComplaints((prev) => [appComplaint, ...prev]);

        return appComplaint;
      } catch (error) {
        console.error("Error adding chatbot complaint:", error);
        return null;
      }
    },
    [user]
  );

  const updateComplaint = useCallback(
    async (id: string, updates: Partial<Complaint>) => {
      try {
        const supabaseUpdates: any = {};

        if (updates.status) {
          supabaseUpdates.status = mapAppStatusToSupabaseStatus(updates.status);
        }
        if (updates.assignedTo) {
          supabaseUpdates.assigned_to = updates.assignedTo;
        }
        if (updates.description) {
          supabaseUpdates.description = updates.description;
        }
        // Add other fields as needed

        const { error } = await supabase
          .from("complaints")
          .update(supabaseUpdates)
          .eq("id", id);

        if (error) {
          console.error("Error updating complaint:", error);
          return;
        }

        // Update local state
        setComplaints((prev) =>
          prev.map((complaint) =>
            complaint.id === id ? { ...complaint, ...updates } : complaint
          )
        );
      } catch (error) {
        console.error("Error in updateComplaint:", error);
      }
    },
    []
  );

  const deleteComplaint = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("complaints").delete().eq("id", id);

      if (error) {
        console.error("Error deleting complaint:", error);
        return false;
      }

      // Update local state
      setComplaints((prev) => prev.filter((complaint) => complaint.id !== id));
      return true;
    } catch (error) {
      console.error("Error in deleteComplaint:", error);
      return false;
    }
  }, []);

  const getComplaintById = useCallback(
    (id: string) => {
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
        updateComplaint,
        deleteComplaint,
        getComplaintById,
        refreshComplaints,
      }}
    >
      {children}
    </ComplaintContext.Provider>
  );
};

export const useComplaints = () => {
  const context = useContext(ComplaintContext);
  if (context === undefined) {
    throw new Error("useComplaints must be used within a ComplaintProvider");
  }
  return context;
};
