import React from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useComplaints } from "../../hooks/useComplaints";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaType, ComplaintArea, Complaint } from "../../types";
import { Lightbulb, HelpCircle, ThumbsUp, AlertTriangle } from "lucide-react";

const UrgencyIndicator: React.FC<{ score: number }> = ({ score }) => {
  const color =
    score > 7 ? "bg-red-500" : score > 4 ? "bg-yellow-500" : "bg-green-500";
  const width = `${score * 10}%`;
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
      <div className={`${color} h-2.5 rounded-full`} style={{ width }}></div>
    </div>
  );
};

const MediaDisplay: React.FC<{
  media: { url: string; name: string; type: MediaType };
}> = ({ media }) => {
  switch (media.type) {
    case MediaType.IMAGE:
      return (
        <img
          src={media.url}
          alt={media.name}
          className="w-full h-full object-cover rounded-lg"
        />
      );
    case MediaType.VIDEO:
      return (
        <video
          src={media.url}
          controls
          className="w-full h-full object-contain bg-black rounded-lg"
        />
      );
    case MediaType.AUDIO:
      return (
        <div className="p-4 flex flex-col justify-center items-center h-full bg-gray-100 rounded-lg">
          <p className="text-xs break-all text-center">{media.name}</p>
          <audio src={media.url} controls className="w-full mt-2" />
        </div>
      );
    default:
      return (
        <a
          href={media.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {media.name}
        </a>
      );
  }
};

/**
 * Configuration object for different submission types.
 * Maps ComplaintArea to user-friendly labels, icons, and color themes.
 */
const SUBMISSION_CONFIG: Record<
  ComplaintArea,
  {
    title: string;
    detailsTitle: string;
    icon: React.ReactNode;
    colorClass: string;
    bgClass: string;
  }
> = {
  TRAIN: {
    title: "Complaint",
    detailsTitle: "Complaint Details",
    icon: <AlertTriangle className="h-5 w-5" />,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
  },
  STATION: {
    title: "Complaint",
    detailsTitle: "Complaint Details",
    icon: <AlertTriangle className="h-5 w-5" />,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
  },
  SUGGESTIONS: {
    title: "Suggestion",
    detailsTitle: "Suggestion Details",
    icon: <Lightbulb className="h-5 w-5" />,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
  },
  ENQUIRY: {
    title: "Inquiry",
    detailsTitle: "Inquiry Details",
    icon: <HelpCircle className="h-5 w-5" />,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
  },
  RAIL_ANUBHAV: {
    title: "Experience",
    detailsTitle: "Experience Details",
    icon: <ThumbsUp className="h-5 w-5" />,
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
  },
};

/**
 * Renders details specific to complaint submissions (TRAIN/STATION areas).
 * Includes PNR, journey date, incident date/time, and location information.
 *
 * @param complaint - The complaint object containing all submission details.
 * @returns JSX element with complaint-specific fields.
 */
const ComplaintDetailsContent: React.FC<{ complaint: Complaint }> = ({
  complaint,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div>
      <Label>Area</Label>
      <p className="font-medium">{complaint.complaintArea}</p>
    </div>
    <div>
      <Label>PNR</Label>
      <p className="font-medium">{complaint.pnr || "N/A"}</p>
    </div>
    <div>
      <Label>Journey Date</Label>
      <p className="font-medium">
        {complaint.journeyDate
          ? new Date(complaint.journeyDate + "T00:00:00").toLocaleDateString()
          : "N/A"}
      </p>
    </div>
    <div>
      <Label>Incident Date</Label>
      <p className="font-medium">
        {new Date(complaint.incidentDate + "T00:00:00").toLocaleDateString()}
      </p>
    </div>
    {complaint.incidentTime && (
      <div>
        <Label>Incident Time</Label>
        <p className="font-medium">{complaint.incidentTime}</p>
      </div>
    )}
    {complaint.location && (
      <div>
        <Label>Location</Label>
        <p className="font-medium">{complaint.location}</p>
      </div>
    )}
    <div className="col-span-1 md:col-span-2">
      <Label>Type</Label>
      <p className="font-medium">{complaint.complaintType}</p>
    </div>
    <div className="col-span-1 md:col-span-2">
      <Label>Sub-Type</Label>
      <p className="font-medium">{complaint.complaintSubType}</p>
    </div>
    {complaint.trainNumber && (
      <div>
        <Label>Train Number</Label>
        <p className="font-medium">{complaint.trainNumber}</p>
      </div>
    )}
    {complaint.coachNumber && (
      <div>
        <Label>Coach Number</Label>
        <p className="font-medium">{complaint.coachNumber}</p>
      </div>
    )}
    {complaint.seatNumber && (
      <div>
        <Label>Seat Number</Label>
        <p className="font-medium">{complaint.seatNumber}</p>
      </div>
    )}
    {complaint.nearestStation && (
      <div>
        <Label>Nearest Station</Label>
        <p className="font-medium">{complaint.nearestStation}</p>
      </div>
    )}
    {complaint.unauthorizedPeopleCount !== undefined && (
      <div>
        <Label>Unauthorized People</Label>
        <p className="font-medium">{complaint.unauthorizedPeopleCount}</p>
      </div>
    )}
    {complaint.mobileNumber && (
      <div>
        <Label>Mobile Number</Label>
        <p className="font-medium">{complaint.mobileNumber}</p>
      </div>
    )}
  </div>
);

/**
 * Renders details specific to suggestion submissions.
 * Simplified layout without PNR or journey-related fields.
 *
 * @param complaint - The complaint object containing suggestion details.
 * @returns JSX element with suggestion-specific fields.
 */
const SuggestionDetailsContent: React.FC<{ complaint: Complaint }> = ({
  complaint,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div className="col-span-1 md:col-span-2">
      <Label>Suggestion Category</Label>
      <p className="font-medium">{complaint.complaintType}</p>
    </div>
    <div className="col-span-1 md:col-span-2">
      <Label>Suggestion Type</Label>
      <p className="font-medium">{complaint.complaintSubType}</p>
    </div>
    <div>
      <Label>Submitted On</Label>
      <p className="font-medium">
        {new Date(complaint.incidentDate + "T00:00:00").toLocaleDateString()}
      </p>
    </div>
    {complaint.location && (
      <div>
        <Label>Related Location/Station</Label>
        <p className="font-medium">{complaint.location}</p>
      </div>
    )}
  </div>
);

/**
 * Renders details specific to inquiry submissions.
 * Focused on the inquiry topic without incident-related fields.
 *
 * @param complaint - The complaint object containing inquiry details.
 * @returns JSX element with inquiry-specific fields.
 */
const InquiryDetailsContent: React.FC<{ complaint: Complaint }> = ({
  complaint,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div className="col-span-1 md:col-span-2">
      <Label>Inquiry Category</Label>
      <p className="font-medium">{complaint.complaintType}</p>
    </div>
    <div className="col-span-1 md:col-span-2">
      <Label>Inquiry Type</Label>
      <p className="font-medium">{complaint.complaintSubType}</p>
    </div>
    <div>
      <Label>Submitted On</Label>
      <p className="font-medium">
        {new Date(complaint.incidentDate + "T00:00:00").toLocaleDateString()}
      </p>
    </div>
    {complaint.pnr && (
      <div>
        <Label>Related PNR</Label>
        <p className="font-medium">{complaint.pnr}</p>
      </div>
    )}
  </div>
);

/**
 * Renders details specific to Rail Anubhav (experience/appreciation) submissions.
 * Positive feedback focused layout with appropriate theming.
 *
 * @param complaint - The complaint object containing experience details.
 * @returns JSX element with experience-specific fields.
 */
const ExperienceDetailsContent: React.FC<{ complaint: Complaint }> = ({
  complaint,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div className="col-span-1 md:col-span-2">
      <Label>Experience Category</Label>
      <p className="font-medium">{complaint.complaintType}</p>
    </div>
    <div className="col-span-1 md:col-span-2">
      <Label>Experience Type</Label>
      <p className="font-medium">{complaint.complaintSubType}</p>
    </div>
    <div>
      <Label>Experience Date</Label>
      <p className="font-medium">
        {new Date(complaint.incidentDate + "T00:00:00").toLocaleDateString()}
      </p>
    </div>
    {complaint.journeyDate && (
      <div>
        <Label>Journey Date</Label>
        <p className="font-medium">
          {new Date(complaint.journeyDate + "T00:00:00").toLocaleDateString()}
        </p>
      </div>
    )}
    {complaint.location && (
      <div>
        <Label>Location</Label>
        <p className="font-medium">{complaint.location}</p>
      </div>
    )}
  </div>
);

/**
 * Selects and renders the appropriate details component based on complaint area.
 *
 * @param complaint - The complaint object to render details for.
 * @returns The appropriate details component for the submission type.
 */
const getDetailsContent = (complaint: Complaint): React.ReactNode => {
  switch (complaint.complaintArea) {
    case "SUGGESTIONS":
      return <SuggestionDetailsContent complaint={complaint} />;
    case "ENQUIRY":
      return <InquiryDetailsContent complaint={complaint} />;
    case "RAIL_ANUBHAV":
      return <ExperienceDetailsContent complaint={complaint} />;
    case "TRAIN":
    case "STATION":
    default:
      return <ComplaintDetailsContent complaint={complaint} />;
  }
};

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getComplaintById } = useComplaints();
  const complaint = id ? getComplaintById(id) : undefined;
  const fromPublicTrack = location.state?.fromPublicTrack;

  if (!complaint) {
    return (
      <div className="text-center">
        <p className="text-white">Submission not found or still loading...</p>
      </div>
    );
  }

  // Get the configuration for this submission type
  const config =
    SUBMISSION_CONFIG[complaint.complaintArea] || SUBMISSION_CONFIG.TRAIN;
  const isComplaint =
    complaint.complaintArea === "TRAIN" ||
    complaint.complaintArea === "STATION";

  return (
    <div className="bg-white/85 backdrop-blur-md p-6 rounded-lg shadow-lg">
      <Button
        variant="ghost"
        onClick={() => navigate(fromPublicTrack ? "/track-concern" : "/status")}
        className="mb-4"
      >
        &larr; Back to {fromPublicTrack ? "Search" : "Dashboard"}
      </Button>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card with Type-Specific Styling */}
          <Card className={config.bgClass}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={`mt-1 ${config.colorClass}`}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgClass} ${config.colorClass} border`}
                      >
                        {config.title}
                      </span>
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                        {complaint.id}
                      </span>
                    </div>
                    <CardTitle className="text-2xl mt-1">
                      {complaint.title}
                    </CardTitle>
                    <CardDescription>
                      Submitted on{" "}
                      {new Date(complaint.createdAt).toLocaleString()}
                    </CardDescription>
                  </div>
                </div>
                <StatusBadge status={complaint.status} />
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2">Description</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {complaint.description}
              </p>
            </CardContent>
          </Card>

          {/* Dynamic Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className={config.colorClass}>{config.icon}</span>
                {config.detailsTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>{getDetailsContent(complaint)}</CardContent>
          </Card>

          {complaint.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {complaint.media.map((mediaItem) => (
                    <div
                      key={mediaItem.id}
                      className="w-full aspect-video rounded-lg overflow-hidden border"
                    >
                      <MediaDisplay media={mediaItem} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {complaint.analysis ? (
                <>
                  <div>
                    <Label>Category</Label>
                    <p className="font-semibold text-primary">
                      {complaint.analysis.category}
                    </p>
                  </div>
                  {/* Only show urgency for complaints, not for suggestions/inquiries/experiences */}
                  {isComplaint && (
                    <div>
                      <Label>
                        Urgency Score ({complaint.analysis.urgencyScore}/10)
                      </Label>
                      <UrgencyIndicator
                        score={complaint.analysis.urgencyScore}
                      />
                    </div>
                  )}
                  {/* Show priority level for non-complaints instead of urgency */}
                  {!isComplaint && (
                    <div>
                      <Label>Priority Level</Label>
                      <p className="font-medium text-muted-foreground">
                        {complaint.analysis.urgencyScore > 7
                          ? "High Priority"
                          : complaint.analysis.urgencyScore > 4
                          ? "Medium Priority"
                          : "Standard"}
                      </p>
                    </div>
                  )}
                  <div>
                    <Label>AI Summary</Label>
                    <p className="text-sm text-muted-foreground">
                      {complaint.analysis.summary}
                    </p>
                  </div>
                  <div>
                    <Label>Keywords</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {complaint.analysis.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center text-muted-foreground">
                  <span>Analysis in progress...</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ComplaintDetailPage;
