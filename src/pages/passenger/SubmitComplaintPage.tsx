import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import { complaintData } from "../../data/complaintData";
import {
  extractFromFiles as extractComplaintDetailsFromFile,
  extractComplaintDetailsFromText,
} from "../../services/unifiedAIService";
import { Priority } from "../../types";
import type { ComplaintArea } from "../../types";

// Helper to get date in YYYY-MM-DD format for input default
const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * SubmitComplaintPage
 *
 * Intent: Presents the traditional complaint submission form. Supports AI-assisted
 * auto-fill via the unified AI service (Gemini or OpenRouter depending on config).
 * Edge cases: gracefully handles missing API configuration by allowing manual input.
 */
const SubmitComplaintPage: React.FC = () => {
  const [complaintArea, setComplaintArea] = useState<ComplaintArea>("TRAIN");
  const [complaintType, setComplaintType] = useState("");
  const [complaintSubType, setComplaintSubType] = useState("");
  const [journeyMode, setJourneyMode] = useState<"PNR" | "UTS">("PNR");
  const [pnr, setPnr] = useState("");
  const [utsNumber, setUtsNumber] = useState("");
  const [journeyDate, setJourneyDate] = useState(getTodayDateString());
  const [incidentDate, setIncidentDate] = useState(getTodayDateString());
  const [incidentTime, setIncidentTime] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [trainNo, setTrainNo] = useState("");
  const [coachNo, setCoachNo] = useState("");
  const [seatNo, setSeatNo] = useState("");
  const [platformNo, setPlatformNo] = useState("");
  const [nearestStation, setNearestStation] = useState("");
  const [unauthorizedPeopleCount, setUnauthorizedPeopleCount] = useState<
    number | ""
  >("");
  const [declaration, setDeclaration] = useState(false);
  const [consentShare, setConsentShare] = useState(false);
  const [pnrVerified, setPnrVerified] = useState(false);
  const [isVerifyingPnr, setIsVerifyingPnr] = useState(false);
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviewUrls, setMediaPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = usePassengerAuth();
  const { addComplaint } = useComplaints();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const complaintTypes = useMemo(() => {
    return Object.keys(complaintData[complaintArea] || {});
  }, [complaintArea]);

  const complaintSubTypes = useMemo(() => {
    if (!complaintArea || !complaintType) return [];
    return complaintData[complaintArea][complaintType] || [];
  }, [complaintArea, complaintType]);

  useEffect(() => {
    if (user?.phone) {
      setMobileNumber(user.phone.replace("+91", "").trim());
    }
  }, [user]);

  useEffect(() => {
    // Check navigation state first, then query parameters
    const stateArea = location.state?.complaintArea;
    const queryArea = searchParams.get("area")?.toUpperCase();

    const targetArea = stateArea || queryArea;

    if (targetArea && ["TRAIN", "STATION"].includes(targetArea)) {
      const newArea = targetArea as ComplaintArea;
      setComplaintArea(newArea);

      // Reset dependent fields to ensure consistency with the new area
      if (newArea === "STATION") {
        setPnr("");
        setJourneyDate("");
      } else {
        setJourneyDate(getTodayDateString());
      }
      setComplaintType("");
      setComplaintSubType("");
    }
  }, [location.state, searchParams]);

  useEffect(() => {
    // Cleanup object URLs on component unmount
    return () => {
      mediaPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [mediaPreviewUrls]);

  const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newArea = e.target.value as ComplaintArea;
    setComplaintArea(newArea);
    setComplaintType("");
    setComplaintSubType("");

    // Logic for train-specific fields
    if (newArea === "STATION") {
      setPnr("");
      setUtsNumber("");
      setJourneyDate(""); // Clear date for station complaints
    } else {
      setPlatformNo(""); // Clear platform for train complaints
      setJourneyMode("PNR"); // Default to PNR for train
      setJourneyDate(getTodayDateString()); // Reset to default for train complaints
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setComplaintType(e.target.value);
    setComplaintSubType("");
  };

  const handleVerifyPnr = async () => {
    if (!pnr) return;
    setIsVerifyingPnr(true);
    // Simulate API call
    setTimeout(() => {
      setPnrVerified(true);
      setIsVerifyingPnr(false);
      // Mock auto-fill
      setTrainNo("12345");
      setCoachNo("B1");
      setSeatNo("42");
    }, 1500);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRemoveMedia = (indexToRemove: number) => {
    URL.revokeObjectURL(mediaPreviewUrls[indexToRemove]);

    setMediaFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
    setMediaPreviewUrls((prev) =>
      prev.filter((_, index) => index !== indexToRemove)
    );

    if (fileInputRef.current) {
      // Resetting file input value is tricky but necessary for re-adding the same file
      fileInputRef.current.value = "";
    }
  };

  const applyExtractedData = (extractedData: any) => {
    if (
      extractedData.complaintArea &&
      ["TRAIN", "STATION"].includes(extractedData.complaintArea)
    ) {
      const newArea = extractedData.complaintArea;
      setComplaintArea(newArea);

      if (newArea === "TRAIN") {
        if (extractedData.pnr) {
          setJourneyMode("PNR");
          setPnr(extractedData.pnr);
        } else if (extractedData.utsNumber) {
          setJourneyMode("UTS");
          setUtsNumber(extractedData.utsNumber);
        }
        if (extractedData.journeyDate)
          setJourneyDate(extractedData.journeyDate);
      } else {
        setPnr("");
        setUtsNumber("");
        setJourneyDate("");
      }

      // Use timeouts to allow react to process chained state updates
      setTimeout(() => {
        const typesForArea = Object.keys(complaintData[newArea] || {});
        if (
          extractedData.complaintType &&
          typesForArea.includes(extractedData.complaintType)
        ) {
          setComplaintType(extractedData.complaintType);
          setTimeout(() => {
            const subTypesForType =
              complaintData[newArea][extractedData.complaintType!] || [];
            if (
              extractedData.complaintSubType &&
              subTypesForType.includes(extractedData.complaintSubType)
            ) {
              setComplaintSubType(extractedData.complaintSubType);
            }
          }, 0);
        }
      }, 0);
    } else {
      if (extractedData.pnr) {
        setJourneyMode("PNR");
        setPnr(extractedData.pnr);
      } else if (extractedData.utsNumber) {
        setJourneyMode("UTS");
        setUtsNumber(extractedData.utsNumber);
      }
      if (extractedData.journeyDate) setJourneyDate(extractedData.journeyDate);
    }

    if (extractedData.incidentDate) setIncidentDate(extractedData.incidentDate);

    if (extractedData.incidentTime) setIncidentTime(extractedData.incidentTime);
    if (extractedData.trainNumber) setTrainNo(extractedData.trainNumber);
    if (extractedData.coachNumber) setCoachNo(extractedData.coachNumber);
    if (extractedData.seatNumber) setSeatNo(extractedData.seatNumber);
    if (extractedData.nearestStation)
      setNearestStation(extractedData.nearestStation);
    if (extractedData.platformNumber)
      setPlatformNo(extractedData.platformNumber);
    if (extractedData.unauthorizedPeopleCount)
      setUnauthorizedPeopleCount(extractedData.unauthorizedPeopleCount);

    if (extractedData.description) {
      setDescription(extractedData.description);
    }
  };

  const handleAnalyzeDescription = async () => {
    if (!description || description.trim().length < 5) {
      setExtractionError("Please enter a detailed description first.");
      return;
    }

    setIsExtracting(true);
    setExtractionError("");
    setError("");

    try {
      const extractedData = await extractComplaintDetailsFromText(description);
      applyExtractedData(extractedData);
    } catch (err) {
      console.error("Error analyzing description:", err);
      setExtractionError(
        "Could not analyze description. Please fill details manually."
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFilesArray: File[] = Array.from(e.target.files as FileList);
      const newPreviewUrls = newFilesArray.map((file: File) =>
        URL.createObjectURL(file)
      );

      setMediaFiles((prev) => [...prev, ...newFilesArray]);
      setMediaPreviewUrls((prev) => [...prev, ...newPreviewUrls]);

      // AI extraction on all new files
      setIsExtracting(true);
      setExtractionError("");
      setError("");

      // Defer the heavy processing to the next paint cycle to ensure the spinner animation starts.
      requestAnimationFrame(() => {
        // Using a second frame is a robust way to ensure the first paint has completed.
        requestAnimationFrame(async () => {
          try {
            const filePartsPromises = newFilesArray.map(async (file: File) => {
              const base64Data = await fileToBase64(file as File);
              return {
                mimeType: (file as File).type,
                data: base64Data,
              };
            });

            const fileParts = await Promise.all(filePartsPromises);

            // Extract metadata for AI context
            const fileMetadata = newFilesArray.map((file) => ({
              name: file.name,
              lastModified: file.lastModified,
              type: file.type,
            }));

            const extractedData = await extractComplaintDetailsFromFile(
              fileParts,
              description,
              fileMetadata
            );

            applyExtractedData(extractedData);
          } catch (err) {
            console.error("Error extracting data from file:", err);
            setExtractionError(
              "Could not automatically extract data. Please fill the rest of the form manually."
            );
          } finally {
            setIsExtracting(false);
          }
        });
      });
    }
  };

  const handleClearForm = () => {
    setComplaintArea("TRAIN");
    setComplaintType("");
    setComplaintSubType("");
    setJourneyMode("PNR");
    setPnr("");
    setUtsNumber("");
    setJourneyDate(getTodayDateString());
    setIncidentDate(getTodayDateString());
    setIncidentTime("");
    setMobileNumber(user?.phone?.replace("+91", "").trim() || "");
    setTrainNo("");
    setCoachNo("");
    setSeatNo("");
    setNearestStation("");
    setPlatformNo("");
    setUnauthorizedPeopleCount("");
    setDeclaration(false);
    setConsentShare(false);
    setPnrVerified(false);
    setDescription("");
    setMediaFiles([]);
    setMediaPreviewUrls([]);
    mediaPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    setError("");
    setExtractionError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Stop default browser validation

    // Manual validation
    let validationError = "";
    if (mediaFiles.length === 0) {
      validationError =
        "Uploading at least one media file (image, video, or audio) is mandatory.";
    } else if (complaintArea === "TRAIN") {
      if (journeyMode === "PNR" && !pnr) {
        validationError =
          "PNR Number is mandatory for train-related complaints (PNR mode).";
      } else if (journeyMode === "UTS" && !utsNumber) {
        validationError =
          "UTS Number is mandatory for train-related complaints (UTS mode).";
      }
    } else if (!mobileNumber || mobileNumber.length !== 10) {
      validationError = "Please enter a valid 10-digit mobile number.";
    } else if (
      !complaintType ||
      !complaintSubType ||
      !description ||
      !incidentDate ||
      !incidentTime
    ) {
      validationError =
        "Please fill all required fields: Incident Date, Time, Type, Sub Type, and Description.";
    } else if (!declaration) {
      validationError =
        "You must declare that the information provided is true.";
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);

    addComplaint(
      {
        description,
        complainantId: user?.id || "anonymous",
        pnr: journeyMode === "PNR" ? pnr : undefined,
        utsNumber: journeyMode === "UTS" ? utsNumber : undefined,
        journeyDate: complaintArea === "TRAIN" ? journeyDate : undefined,
        incidentDate,
        incidentTime,
        mobileNumber: `+91${mobileNumber}`,
        complaintArea,
        complaintType,
        complaintSubType,
        trainNumber: trainNo,
        coachNumber: coachNo,
        seatNumber: seatNo,
        nearestStation,
        platformNumber: platformNo,
        unauthorizedPeopleCount:
          unauthorizedPeopleCount === ""
            ? undefined
            : Number(unauthorizedPeopleCount),
        declaration,
        consentShare,
        priority: Priority.MEDIUM, // Default priority for new complaints
      },
      mediaFiles
    )
      .then((newComplaint) => {
        if (newComplaint) {
          navigate(`/status/${newComplaint.id}`);
        } else {
          setError("Failed to submit complaint. Please try again.");
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        setError("An unexpected error occurred.");
        setLoading(false);
      });
  };

  const renderPreview = (file: File, url: string) => {
    const fileType = file.type.split("/")[0];
    switch (fileType) {
      case "image":
        return (
          <img
            src={url}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        );
      case "video":
        return (
          <video
            src={url}
            controls
            className="h-full w-full object-contain bg-black"
          />
        );
      case "audio":
        return (
          <div className="p-2 flex flex-col justify-center items-center h-full bg-gray-100">
            <p className="text-xs break-all">{file.name}</p>
            <audio src={url} controls className="w-full mt-2" />
          </div>
        );
      default:
        return <p className="text-sm text-muted-foreground p-2">{file.name}</p>;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white/85 backdrop-blur-md shadow-lg">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="mt-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="space-y-1.5">
          <CardTitle>File a New Complaint</CardTitle>
          <CardDescription>
            Upload media evidence. For train issues, provide your PNR. Our AI
            will analyze all uploaded files to help pre-fill the form.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <div
                className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded relative mb-2"
                role="alert"
              >
                <p className="text-sm">
                  Please describe your issue first. This helps our AI assist you
                  better with the rest of the form.
                </p>
              </div>
              <Label htmlFor="description">Grievance Description *</Label>
              <div className="relative">
                <Textarea
                  id="description"
                  placeholder="Provide all relevant details. The AI will enhance this with information from your uploaded file."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading || isExtracting}
                  className="min-h-[150px] pb-10"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-2 right-2 text-xs h-7 shadow-sm border"
                  onClick={handleAnalyzeDescription}
                  disabled={loading || isExtracting || !description}
                >
                  {isExtracting ? "Analyzing..." : "Auto-fill Form"}
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="media">Upload Files *</Label>
              <div className="relative flex items-center justify-center rounded-lg p-6 text-center min-h-[12rem]">
                {isExtracting ? (
                  <LoadingScreen
                    size="lg"
                    message="Analyzing files..."
                    description="This may take a moment."
                    showAnimation={true}
                  />
                ) : mediaFiles.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
                    {mediaFiles.map((file, index) => (
                      <div
                        key={index}
                        className="relative w-full aspect-square rounded-lg overflow-hidden border"
                      >
                        {renderPreview(file, mediaPreviewUrls[index])}
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 z-10 h-6 w-6 p-0"
                          onClick={() => handleRemoveMedia(index)}
                        >
                          &times;
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div>
                    <svg
                      className="mx-auto h-12 w-12 text-muted-foreground"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Image, Video, or Audio
                    </p>
                  </div>
                )}
                <Input
                  id="media"
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={loading || isExtracting}
                  accept="image/*,video/*,audio/*"
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              {extractionError && (
                <p className="text-sm text-destructive mt-2">
                  {extractionError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="complaintArea">Complaint Area *</Label>
              <select
                id="complaintArea"
                value={complaintArea}
                onChange={handleAreaChange}
                disabled={loading || isExtracting}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="TRAIN">Train</option>
                <option value="STATION">Station</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentDate">Incident Date *</Label>
              <Input
                id="incidentDate"
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                disabled={loading || isExtracting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incidentTime">Incident Time *</Label>
              <Input
                id="incidentTime"
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                disabled={loading || isExtracting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                  +91
                </span>
                <Input
                  id="mobileNumber"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={mobileNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                    setMobileNumber(val);
                  }}
                  disabled={loading || isExtracting}
                  className="rounded-l-none"
                  maxLength={10}
                />
              </div>
            </div>

            {complaintArea === "TRAIN" && (
              <div className="space-y-2">
                <Label htmlFor="journeyMode">Journey Details *</Label>
                <select
                  id="journeyMode"
                  value={journeyMode}
                  onChange={(e) =>
                    setJourneyMode(e.target.value as "PNR" | "UTS")
                  }
                  disabled={loading || isExtracting}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
                >
                  <option value="PNR">PNR</option>
                  <option value="UTS">UTS</option>
                </select>
              </div>
            )}

            {complaintArea === "TRAIN" &&
              (journeyMode === "PNR" ? (
                <div className="space-y-2">
                  <Label htmlFor="pnr">PNR No *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="pnr"
                      placeholder="10-digit PNR Number"
                      value={pnr}
                      onChange={(e) => setPnr(e.target.value)}
                      disabled={loading || isExtracting}
                      maxLength={10}
                    />
                    <Button
                      type="button"
                      onClick={handleVerifyPnr}
                      disabled={!pnr || isVerifyingPnr || pnrVerified}
                      variant="outline"
                    >
                      {isVerifyingPnr
                        ? "Verifying..."
                        : pnrVerified
                        ? "Verified"
                        : "Verify"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="utsNumber">UTS No *</Label>
                  <Input
                    id="utsNumber"
                    placeholder="UTS Ticket Number"
                    value={utsNumber}
                    onChange={(e) => setUtsNumber(e.target.value)}
                    disabled={loading || isExtracting}
                    maxLength={10}
                  />
                </div>
              ))}
            {complaintArea === "TRAIN" && (
              <div className="space-y-2">
                <Label htmlFor="journeyDate">Journey Date</Label>
                <Input
                  id="journeyDate"
                  type="date"
                  value={journeyDate}
                  onChange={(e) => setJourneyDate(e.target.value)}
                  disabled={loading || isExtracting}
                />
              </div>
            )}

            {complaintArea === "STATION" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nearestStation">Station Name / Code *</Label>
                  <Input
                    id="nearestStation"
                    placeholder="Enter station name or code"
                    value={nearestStation}
                    onChange={(e) => setNearestStation(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="platformNo">Platform No</Label>
                  <Input
                    id="platformNo"
                    placeholder="Platform Number"
                    value={platformNo}
                    onChange={(e) => setPlatformNo(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
              </>
            )}

            {complaintArea === "TRAIN" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="trainNo">Train No</Label>
                  <Input
                    id="trainNo"
                    placeholder="Train Number"
                    value={trainNo}
                    onChange={(e) => setTrainNo(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coachNo">Coach No</Label>
                  <Input
                    id="coachNo"
                    placeholder="e.g., B1, S4"
                    value={coachNo}
                    onChange={(e) => setCoachNo(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seatNo">Seat/Berth No</Label>
                  <Input
                    id="seatNo"
                    placeholder="e.g., 42, UB"
                    value={seatNo}
                    onChange={(e) => setSeatNo(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nearestStation">
                    Nearest Station / Location
                  </Label>
                  <Input
                    id="nearestStation"
                    placeholder="Current location or nearest station"
                    value={nearestStation}
                    onChange={(e) => setNearestStation(e.target.value)}
                    disabled={loading || isExtracting}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="complaintType">Type *</Label>
              <select
                id="complaintType"
                value={complaintType}
                onChange={handleTypeChange}
                disabled={loading || isExtracting || !complaintArea}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="" disabled>
                  Select a type
                </option>
                {complaintTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="complaintSubType">Sub Type *</Label>
              <select
                id="complaintSubType"
                value={complaintSubType}
                onChange={(e) => setComplaintSubType(e.target.value)}
                disabled={loading || isExtracting || !complaintType}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900"
              >
                <option value="" disabled>
                  Select a sub type
                </option>
                {complaintSubTypes.map((subType) => (
                  <option key={subType} value={subType}>
                    {subType}
                  </option>
                ))}
              </select>
            </div>

            {complaintType === "Overcrowding" && (
              <div className="space-y-2">
                <Label htmlFor="unauthorizedPeopleCount">
                  Approx. Unauthorized People
                </Label>
                <Input
                  id="unauthorizedPeopleCount"
                  type="number"
                  placeholder="Estimate count"
                  value={unauthorizedPeopleCount}
                  onChange={(e) =>
                    setUnauthorizedPeopleCount(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  disabled={loading || isExtracting}
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="declaration"
                checked={declaration}
                onChange={(e) => setDeclaration(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="declaration" className="text-sm font-normal">
                I hereby declare that the information provided is true to the
                best of my knowledge.
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="consentShare"
                checked={consentShare}
                onChange={(e) => setConsentShare(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="consentShare" className="text-sm font-normal">
                I consent to share my phone number with onboard security staff
                for immediate assistance.
              </Label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
              disabled={loading || isExtracting}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClearForm}
              disabled={loading || isExtracting}
            >
              Clear Form
            </Button>
            <Button
              type="submit"
              className="sm:flex-grow"
              disabled={loading || isExtracting}
            >
              {loading
                ? "Submitting..."
                : isExtracting
                ? "Analyzing files..."
                : "Submit Complaint"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default SubmitComplaintPage;
