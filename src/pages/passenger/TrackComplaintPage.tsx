import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useComplaints } from "../../hooks/useComplaints";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * TrackComplaintPage Component
 *
 * A traditional form interface for tracking complaints by Reference Number.
 * Allows users to enter a Complaint ID or Reference Number to check its status.
 */
const TrackComplaintPage: React.FC = () => {
  const [referenceNo, setReferenceNo] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { getComplaintById, complaints } = useComplaints();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!referenceNo.trim()) {
      setError("Please enter a Reference Number.");
      return;
    }

    // Basic validation for special characters as per screenshot note
    // Note: special characters {! @ # $ ^ : ; & + = ₹ ÷ , * % "} are not permitted
    const specialCharsRegex = /[!@#$^:;&+=₹÷,*%"]/;
    if (specialCharsRegex.test(referenceNo)) {
      setError("Special characters are not permitted.");
      return;
    }

    // Try to find the complaint
    // Support full CRN (CMP-XXXXX-XXXX) or partial matches
    const searchTerm = referenceNo.trim().toUpperCase();

    // First try exact match
    let complaint = getComplaintById(referenceNo);

    // If not found, try case-insensitive search or partial match
    if (!complaint) {
      complaint = complaints.find(
        (c) =>
          c.id.toUpperCase() === searchTerm ||
          c.id.toUpperCase().includes(searchTerm) ||
          searchTerm.includes(c.id.toUpperCase())
      );
    }

    if (complaint) {
      navigate(`/track-concern/result/${complaint.id}`, {
        state: { fromPublicTrack: true },
      });
    } else {
      setError("Complaint not found. Please check the Reference Number.");
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-md mt-10">
      <Card className="shadow-lg">
        <CardHeader className="bg-[#8a1538] text-white rounded-t-lg flex flex-row items-center gap-4 space-y-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/20 hover:text-white shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl font-bold">
            Track Your Concern
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="referenceNo"
                className="text-gray-700 font-medium"
              >
                Reference No.: <span className="text-red-500">*</span>
              </Label>
              <Input
                id="referenceNo"
                type="text"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g., CMP-M1ABC-X2Y3"
                className="w-full border-gray-300 focus:border-[#8a1538] focus:ring-[#8a1538]"
              />
              <p className="text-xs text-gray-500">
                Enter your Complaint Reference Number (CMP-..., SUG-..., or
                EXP-...)
              </p>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium">{error}</div>
            )}

            <div className="flex gap-4">
              <Button
                type="submit"
                className="bg-[#8a1538] hover:bg-[#6d102b] text-white w-full"
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrackComplaintPage;
