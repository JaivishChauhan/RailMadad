import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useComplaints } from "../../hooks/useComplaints";
import { usePassengerAuth } from "../../hooks/usePassengerAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import type { Complaint } from "../../types";
import { Status } from "../../types";
import {
  Search,
  MessageCircle,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { functionCallService } from "../../services/functionCallService";

const ComplaintStatusPage: React.FC = () => {
  const {
    complaints,
    loading: complaintsLoading,
    takeBackComplaint,
  } = useComplaints();
  const { user, loading: authLoading } = usePassengerAuth();
  const navigate = useNavigate();
  const [takingBack, setTakingBack] = useState<string | null>(null);

  // Tracking lookup state
  const [trackingId, setTrackingId] = useState("");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingResult, setTrackingResult] = useState<{
    success: boolean;
    message: string;
    data?: Complaint;
  } | null>(null);

  /**
   * Handles quick complaint lookup using the tracking service.
   * Searches for a complaint by ID and displays the result inline.
   */
  const handleTrackingLookup = useCallback(async () => {
    if (!trackingId.trim()) return;

    setTrackingLoading(true);
    setTrackingResult(null);

    try {
      const result = await functionCallService.executeFunction(
        "getComplaintStatus",
        { complaintId: trackingId.trim() }
      );

      setTrackingResult({
        success: result.success,
        message: result.message,
        data: result.data as Complaint | undefined,
      });

      // If found and has redirect, navigate after a brief delay
      if (result.success && result.redirectTo) {
        setTimeout(() => {
          navigate(result.redirectTo!);
        }, 1500);
      }
    } catch (error) {
      setTrackingResult({
        success: false,
        message: "Failed to look up complaint. Please try again.",
      });
    } finally {
      setTrackingLoading(false);
    }
  }, [trackingId, navigate]);

  // For passengers, the useComplaints hook already filters complaints by user_id at the database level
  // So we don't need to filter again here - just sort the complaints
  const userComplaints = complaints.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const suggestions = userComplaints.filter(
    (c) => c.complaintArea === "SUGGESTIONS"
  );
  const enquiries = userComplaints.filter((c) => c.complaintArea === "ENQUIRY");
  const railAnubhavs = userComplaints.filter(
    (c) => c.complaintArea === "RAIL_ANUBHAV"
  );
  const regularComplaints = userComplaints.filter(
    (c) =>
      c.complaintArea !== "SUGGESTIONS" &&
      c.complaintArea !== "ENQUIRY" &&
      c.complaintArea !== "RAIL_ANUBHAV"
  );

  // Helper function to determine if a complaint can be taken back
  const canTakeBack = (complaint: Complaint): boolean => {
    return (
      complaint.status === Status.REGISTERED ||
      complaint.status === Status.ANALYZING
    );
  };

  // Helper function to handle taking back a complaint
  const handleTakeBack = async (complaintId: string) => {
    setTakingBack(complaintId);
    try {
      const success = await takeBackComplaint(complaintId);
      if (success) {
        // Success feedback could be added here
        console.log("Complaint taken back successfully");
      } else {
        // Error feedback could be added here
        console.error("Failed to take back complaint");
      }
    } catch (error) {
      console.error("Error taking back complaint:", error);
    } finally {
      setTakingBack(null);
    }
  };

  const renderComplaintCard = (complaint: Complaint) => (
    <Card key={complaint.id} className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-lg leading-snug">
          {complaint.title}
        </CardTitle>
        <div className="flex justify-between items-center text-sm text-muted-foreground pt-1">
          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
            {complaint.id}
          </span>
          <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {complaint.description}
        </p>
        {complaint.analysis && (
          <div className="mt-3 text-xs">
            <span className="font-semibold">AI Category:</span>{" "}
            {complaint.analysis.category}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <StatusBadge status={complaint.status} />
        <div className="flex gap-2">
          {complaint.status === Status.WITHDRAWN ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/edit-complaint/${complaint.id}`)}
            >
              Edit & Resubmit
            </Button>
          ) : canTakeBack(complaint) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTakeBack(complaint.id)}
              disabled={takingBack === complaint.id}
            >
              {takingBack === complaint.id ? "Taking Back..." : "Take Back"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/status/${complaint.id}`)}
          >
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );

  if (authLoading || complaintsLoading) {
    return (
      <div className="text-center">
        <p className="text-white">Loading your complaints...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/85 backdrop-blur-md p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        <Button variant="outline" onClick={() => navigate(-1)}>
          &larr; Back
        </Button>
      </div>

      {/* Quick Tracking Lookup Section */}
      <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Quick Complaint Lookup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Input
                placeholder="Enter Complaint ID (e.g., CMP..., SUG..., or PNR)"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrackingLookup()}
                className="pr-10"
              />
              {trackingLoading && (
                <Loader2 className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary" />
              )}
            </div>
            <Button
              onClick={handleTrackingLookup}
              disabled={trackingLoading || !trackingId.trim()}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Track
            </Button>
          </div>

          {/* Tracking Result Display */}
          {trackingResult && (
            <div
              className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                trackingResult.success
                  ? "bg-green-50 border border-green-200 text-green-800"
                  : "bg-red-50 border border-red-200 text-red-800"
              }`}
            >
              {trackingResult.success ? (
                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">{trackingResult.message}</p>
                {trackingResult.success && trackingResult.data && (
                  <p className="text-xs mt-1 opacity-80">
                    Redirecting to complaint details...
                  </p>
                )}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2">
            Enter your Complaint Reference Number to quickly check its status.
            Need more help?{" "}
            <button
              onClick={() => {
                // Trigger chatbot in tracking mode - dispatch custom event
                document.dispatchEvent(
                  new CustomEvent("railmadad:openChat", {
                    detail: { mode: "tracking" },
                  })
                );
              }}
              className="text-primary hover:underline font-medium"
            >
              Chat with our Tracking Assistant
            </button>
          </p>
        </CardContent>
      </Card>

      {userComplaints.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h3 className="text-xl font-semibold">No complaints filed yet.</h3>
          <p className="text-muted-foreground mt-2">
            Ready to report an issue?
          </p>
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            <Button
              onClick={() =>
                navigate("/submit", { state: { complaintArea: "TRAIN" } })
              }
            >
              File a Complaint
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                navigate("/submit", { state: { complaintArea: "SUGGESTIONS" } })
              }
            >
              Make a Suggestion
            </Button>

            <Button variant="outline" onClick={() => navigate("/rail-anubhav")}>
              Share Rail Anubhav
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4">
              <h2 className="text-2xl font-bold">Complaints</h2>
              <Button
                size="sm"
                onClick={() =>
                  navigate("/submit", { state: { complaintArea: "TRAIN" } })
                }
              >
                + New Complaint
              </Button>
            </div>
            {regularComplaints.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {regularComplaints.map(renderComplaintCard)}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No active complaints.
              </p>
            )}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4">
              <h2 className="text-2xl font-bold">Suggestions</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  navigate("/suggestions", {
                    state: { complaintArea: "SUGGESTIONS" },
                  })
                }
              >
                + New Suggestion
              </Button>
            </div>
            {suggestions.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {suggestions.map(renderComplaintCard)}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No suggestions submitted.
              </p>
            )}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4">
              <h2 className="text-2xl font-bold">Enquiries</h2>
            </div>
            {enquiries.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {enquiries.map(renderComplaintCard)}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No enquiries submitted.
              </p>
            )}
          </div>

          <div className="mb-8">
            <div className="flex justify-between items-center border-b-2 border-gray-200 pb-2 mb-4">
              <h2 className="text-2xl font-bold">Rail Anubhav</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/rail-anubhav")}
              >
                + Share Experience
              </Button>
            </div>
            {railAnubhavs.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {railAnubhavs.map(renderComplaintCard)}
              </div>
            ) : (
              <p className="text-muted-foreground italic">
                No experiences shared.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ComplaintStatusPage;
