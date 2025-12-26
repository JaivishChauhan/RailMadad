import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useComplaints } from "../hooks/useComplaints";
import { usePassengerAuth } from "../hooks/usePassengerAuth";
import { Priority } from "../types";

/**
 * RailAnubhavPage Component
 *
 * A traditional form for users to share their railway experiences (Rail Anubhav).
 * This mimics the layout and functionality of the official RailMadad experience sharing form.
 */
const RailAnubhavPage: React.FC = () => {
  const navigate = useNavigate();
  const { addComplaint } = useComplaints();
  const { user } = usePassengerAuth();
  const [mobileNo, setMobileNo] = useState("");
  const [mode, setMode] = useState("");
  const [trainStation, setTrainStation] = useState("");
  const [positiveAspect, setPositiveAspect] = useState("");
  const [experience, setExperience] = useState("");
  const [rating, setRating] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  /**
   * Simulates OTP generation
   */
  const handleGetOTP = () => {
    if (mobileNo.length === 10) {
      setOtpSent(true);
      alert("OTP Sent (Simulation)");
    } else {
      alert("Please enter a valid 10-digit mobile number");
    }
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addComplaint(
        {
          description: experience,
          complainantId: user?.id,
          mobileNumber: `+91${mobileNo}`,
          complaintArea: "RAIL_ANUBHAV",
          complaintType: positiveAspect || "General Experience",
          complaintSubType: "Appreciation",
          incidentDate: new Date().toISOString().split("T")[0],
          incidentTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
          priority: Priority.LOW,
          // Map specific fields
          trainNumber: mode === "Train" ? trainStation : undefined,
          stationName: mode === "Station" ? trainStation : undefined,
        },
        []
      );

      alert("Thank you for sharing your experience!");
      navigate("/status"); // Navigate to dashboard to see the submission
    } catch (error) {
      console.error("Error submitting Rail Anubhav:", error);
      alert("Failed to submit. Please try again.");
    }
  };

  /**
   * Resets the form to initial state
   */
  const handleReset = () => {
    setMobileNo("");
    setMode("");
    setTrainStation("");
    setPositiveAspect("");
    setExperience("");
    setRating(0);
    setOtpSent(false);
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl pt-20">
      <Card className="w-full bg-white/90 backdrop-blur-sm shadow-xl border-t-4 border-t-[#8B0000]">
        <CardHeader className="bg-white border-b pb-4 flex flex-row items-center gap-4 space-y-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-2xl font-bold text-[#8B0000]">
            Share Your Rail Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mobile No */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-gray-600">
                Mobile No.
              </Label>
              <div className="flex gap-2">
                <Input
                  id="mobile"
                  placeholder=""
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  className="flex-1 bg-gray-50"
                />
                <Button
                  type="button"
                  onClick={handleGetOTP}
                  className="bg-[#8B0000] hover:bg-[#660000] text-white"
                >
                  Get OTP
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Mode */}
              <div className="space-y-2">
                <Label htmlFor="mode" className="text-gray-600">
                  Mode <span className="text-red-500">*</span>
                </Label>
                <select
                  id="mode"
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  required
                >
                  <option value="">--Select--</option>
                  <option value="Train">Train</option>
                  <option value="Station">Station</option>
                </select>
              </div>

              {/* Train No./Station Name */}
              <div className="space-y-2">
                <Label htmlFor="trainStation" className="text-gray-600">
                  Train No./Station Name<span className="text-red-500">*</span>
                </Label>
                <Input
                  id="trainStation"
                  value={trainStation}
                  onChange={(e) => setTrainStation(e.target.value)}
                  className="bg-gray-50"
                  required
                />
              </div>
            </div>

            {/* Positive Aspects */}
            <div className="space-y-2">
              <Label htmlFor="positiveAspect" className="text-gray-600">
                Positive Aspects<span className="text-red-500">*</span>
              </Label>
              <select
                id="positiveAspect"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-gray-50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={positiveAspect}
                onChange={(e) => setPositiveAspect(e.target.value)}
                required
              >
                <option value="">--Select--</option>
                <option value="Neat & Clean Coaches">
                  Neat & Clean Coaches
                </option>
                <option value="Clean Toilets">Clean Toilets</option>
                <option value="Good Quality & Clean Bed Roll">
                  Good Quality & Clean Bed Roll
                </option>
                <option value="Courteous & Prompt Behavior of Staff">
                  Courteous & Prompt Behavior of Staff
                </option>
                <option value="Good Food">Good Food</option>
                <option value="Support Provided for Senior Citizen, Divyangjan/Women">
                  Support Provided for Senior Citizen, Divyangjan/Women
                </option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Write Your Experience */}
            <div className="space-y-2">
              <Label htmlFor="experience" className="text-gray-600">
                Write Your Experience<span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="experience"
                className="min-h-[100px] bg-gray-50"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                required
              />
            </div>

            {/* Feedback (Star Rating) */}
            <div className="space-y-2 p-4 bg-gray-50 rounded-lg border">
              <Label className="text-gray-600">
                Feedback<span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-4xl focus:outline-none transition-colors ${
                      star <= rating ? "text-yellow-400" : "text-gray-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-500">
              Note: special characters {"{! @ # $ ^ : ; & + = ₹ ÷ , * % }"} are
              not permitted
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="submit"
                className="bg-[#8B0000] hover:bg-[#660000] text-white min-w-[120px]"
              >
                Submit
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleReset}
                className="bg-gray-400 hover:bg-gray-500 text-white min-w-[120px]"
              >
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RailAnubhavPage;
