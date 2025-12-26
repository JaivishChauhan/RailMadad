import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useComplaints } from "../../hooks/useComplaints";
import { usePassengerAuth } from "../../hooks/usePassengerAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Status } from "../../types";
import type { Complaint } from "../../types";

const EditComplaintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getComplaintById,
    resubmitComplaint,
    loading: complaintsLoading,
  } = useComplaints();
  const { user, loading: authLoading } = usePassengerAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [formData, setFormData] = useState({
    description: "",
    complaintType: "",
    complaintSubType: "",
    incidentDate: "",
    location: "",
    trainNumber: "",
    trainName: "",
    pnr: "",
    coachNumber: "",
    seatNumber: "",
    journeyDate: "",
    stationCode: "",
    stationName: "",
  });
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id && !complaintsLoading) {
      const foundComplaint = getComplaintById(id);
      if (foundComplaint) {
        if (foundComplaint.status !== Status.WITHDRAWN) {
          // Redirect if complaint is not withdrawn
          navigate("/status");
          return;
        }
        setComplaint(foundComplaint);
        setFormData({
          description: foundComplaint.description,
          complaintType: foundComplaint.complaintType,
          complaintSubType: foundComplaint.complaintSubType,
          incidentDate: foundComplaint.incidentDate,
          location: foundComplaint.location || "",
          trainNumber: foundComplaint.trainNumber || "",
          trainName: foundComplaint.trainName || "",
          pnr: foundComplaint.pnr || "",
          coachNumber: foundComplaint.coachNumber || "",
          seatNumber: foundComplaint.seatNumber || "",
          journeyDate: foundComplaint.journeyDate || "",
          stationCode: foundComplaint.stationCode || "",
          stationName: foundComplaint.stationName || "",
        });
      } else {
        navigate("/status");
      }
    }
  }, [id, getComplaintById, complaintsLoading, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setMediaFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaint || !id) return;

    setIsSubmitting(true);
    try {
      // Prepare updated data (only include changed fields)
      const updatedData: any = {};

      if (formData.description !== complaint.description)
        updatedData.description = formData.description;
      if (formData.complaintType !== complaint.complaintType)
        updatedData.complaintType = formData.complaintType;
      if (formData.complaintSubType !== complaint.complaintSubType)
        updatedData.complaintSubType = formData.complaintSubType;
      if (formData.incidentDate !== complaint.incidentDate)
        updatedData.incidentDate = formData.incidentDate;
      if (formData.location !== (complaint.location || ""))
        updatedData.location = formData.location;
      if (formData.trainNumber !== (complaint.trainNumber || ""))
        updatedData.trainNumber = formData.trainNumber;
      if (formData.trainName !== (complaint.trainName || ""))
        updatedData.trainName = formData.trainName;
      if (formData.pnr !== (complaint.pnr || ""))
        updatedData.pnr = formData.pnr;
      if (formData.coachNumber !== (complaint.coachNumber || ""))
        updatedData.coachNumber = formData.coachNumber;
      if (formData.seatNumber !== (complaint.seatNumber || ""))
        updatedData.seatNumber = formData.seatNumber;
      if (formData.journeyDate !== (complaint.journeyDate || ""))
        updatedData.journeyDate = formData.journeyDate;
      if (formData.stationCode !== (complaint.stationCode || ""))
        updatedData.stationCode = formData.stationCode;
      if (formData.stationName !== (complaint.stationName || ""))
        updatedData.stationName = formData.stationName;

      const success = await resubmitComplaint(id, updatedData, mediaFiles);

      if (success) {
        navigate("/status");
      } else {
        // Handle error - could show toast notification
        console.error("Failed to resubmit complaint");
      }
    } catch (error) {
      console.error("Error resubmitting complaint:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || complaintsLoading) {
    return (
      <div className="text-center">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="text-center">
        <p>Complaint not found or not editable.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/85 backdrop-blur-md p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Complaint</h1>
        <Button variant="outline" onClick={() => navigate("/status")}>
          &larr; Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Your Complaint Details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Make your changes and resubmit your complaint. It will be reviewed
            again.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium mb-2"
              >
                Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your complaint in detail..."
              />
            </div>

            {/* Complaint Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="complaintType"
                  className="block text-sm font-medium mb-2"
                >
                  Complaint Type *
                </label>
                <input
                  type="text"
                  id="complaintType"
                  name="complaintType"
                  value={formData.complaintType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="complaintSubType"
                  className="block text-sm font-medium mb-2"
                >
                  Complaint Sub-Type *
                </label>
                <input
                  type="text"
                  id="complaintSubType"
                  name="complaintSubType"
                  value={formData.complaintSubType}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Incident Date and Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="incidentDate"
                  className="block text-sm font-medium mb-2"
                >
                  Incident Date *
                </label>
                <input
                  type="date"
                  id="incidentDate"
                  name="incidentDate"
                  value={formData.incidentDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="location"
                  className="block text-sm font-medium mb-2"
                >
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Train Details (if applicable) */}
            {complaint.complaintArea === "TRAIN" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Train Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="trainNumber"
                      className="block text-sm font-medium mb-2"
                    >
                      Train Number
                    </label>
                    <input
                      type="text"
                      id="trainNumber"
                      name="trainNumber"
                      value={formData.trainNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="trainName"
                      className="block text-sm font-medium mb-2"
                    >
                      Train Name
                    </label>
                    <input
                      type="text"
                      id="trainName"
                      name="trainName"
                      value={formData.trainName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="pnr"
                      className="block text-sm font-medium mb-2"
                    >
                      PNR Number
                    </label>
                    <input
                      type="text"
                      id="pnr"
                      name="pnr"
                      value={formData.pnr}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="journeyDate"
                      className="block text-sm font-medium mb-2"
                    >
                      Journey Date
                    </label>
                    <input
                      type="date"
                      id="journeyDate"
                      name="journeyDate"
                      value={formData.journeyDate}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coachNumber"
                      className="block text-sm font-medium mb-2"
                    >
                      Coach Number
                    </label>
                    <input
                      type="text"
                      id="coachNumber"
                      name="coachNumber"
                      value={formData.coachNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="seatNumber"
                      className="block text-sm font-medium mb-2"
                    >
                      Seat Number
                    </label>
                    <input
                      type="text"
                      id="seatNumber"
                      name="seatNumber"
                      value={formData.seatNumber}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Station Details (if applicable) */}
            {complaint.complaintArea === "STATION" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Station Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="stationCode"
                      className="block text-sm font-medium mb-2"
                    >
                      Station Code
                    </label>
                    <input
                      type="text"
                      id="stationCode"
                      name="stationCode"
                      value={formData.stationCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="stationName"
                      className="block text-sm font-medium mb-2"
                    >
                      Station Name
                    </label>
                    <input
                      type="text"
                      id="stationName"
                      name="stationName"
                      value={formData.stationName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Media */}
            <div>
              <label htmlFor="media" className="block text-sm font-medium mb-2">
                Add Additional Media (Optional)
              </label>
              <input
                type="file"
                id="media"
                name="media"
                onChange={handleFileChange}
                multiple
                accept="image/*,video/*,audio/*"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                You can add new files. Existing media will be preserved.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/status")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Resubmitting..." : "Resubmit Complaint"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default EditComplaintPage;
