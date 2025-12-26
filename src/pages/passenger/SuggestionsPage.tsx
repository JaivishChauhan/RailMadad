import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePassengerAuth } from "../../hooks/usePassengerAuth";
import { useComplaints } from "../../hooks/useComplaints";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { complaintData } from "../../data/complaintData";
import { Priority } from "../../types";

const SuggestionsPage: React.FC = () => {
  const [suggestionType, setSuggestionType] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = usePassengerAuth();
  const { addComplaint } = useComplaints();
  const navigate = useNavigate();

  const suggestionTypes = useMemo(() => {
    return Object.keys(complaintData["SUGGESTIONS"] || {});
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!suggestionType) {
      setError("Please select a suggestion type.");
      return;
    }
    if (!description) {
      setError("Please provide a description.");
      return;
    }
    if (!user) {
      setError("You must be logged in to submit a suggestion.");
      return;
    }

    setError("");
    setLoading(true);

    addComplaint(
      {
        description,
        complainantId: user.id,
        complaintArea: "SUGGESTIONS",
        complaintType: suggestionType,
        complaintSubType: suggestionType,
        incidentDate: new Date().toISOString().split("T")[0],
        incidentTime: new Date().toTimeString().split(" ")[0].substring(0, 5),
        priority: Priority.LOW,
        // @ts-ignore - Status is handled by addComplaint
        status: "REGISTERED",
        title: `Suggestion: ${suggestionType}`,
      },
      []
    )
      .then((newComplaint) => {
        if (newComplaint) {
          navigate(`/status/${newComplaint.id}`);
        } else {
          setError("Failed to submit suggestion. Please try again.");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("An unexpected error occurred.");
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSuggestionType("");
    setDescription("");
    setError("");
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white/85 backdrop-blur-md shadow-lg mt-8">
      <CardHeader className="bg-[#8a1538] text-white rounded-t-lg">
        <CardTitle>Suggestions Detail</CardTitle>
        <CardDescription className="text-gray-200">
          *Mandatory Fields
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="suggestionType">Suggestion*</Label>
            <select
              id="suggestionType"
              value={suggestionType}
              onChange={(e) => setSuggestionType(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">--Select--</option>
              {suggestionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description*</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[150px]"
            />
            <p className="text-xs text-muted-foreground">
              Note: special characters &#123;! @ # $ ^ : ; & + = &#8377; &#247;
              , * % &#125; are not permitted
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end space-x-4">
            <Button
              type="submit"
              className="bg-[#8a1538] hover:bg-[#6d102b] text-white min-w-[100px]"
              disabled={loading}
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              disabled={loading}
              className="min-w-[100px]"
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SuggestionsPage;
