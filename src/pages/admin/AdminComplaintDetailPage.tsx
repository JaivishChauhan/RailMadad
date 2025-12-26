import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { LoadingScreen } from "../../components/ui/LoadingScreen";
import {
  Status,
  MediaType,
  ComplaintSource,
  ComplaintArea,
  Complaint,
} from "../../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteConfirmationModal } from "../../components/ui/DeleteConfirmationModal";
import SuperAdminLayout from "../../components/admin/SuperAdminLayout";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Role } from "../../types";
import {
  AlertTriangle,
  ShieldAlert,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
} from "lucide-react";
import { LocalAuthService } from "../../services/localAuthService";
import { RAILWAY_ZONES } from "../../data/railwayZones";

/**
 * Configuration object for different submission types in admin view.
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
    breadcrumbLabel: string;
  }
> = {
  TRAIN: {
    title: "Complaint",
    detailsTitle: "Complaint Details",
    icon: <AlertTriangle className="h-5 w-5" />,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
    breadcrumbLabel: "Complaints",
  },
  STATION: {
    title: "Complaint",
    detailsTitle: "Complaint Details",
    icon: <AlertTriangle className="h-5 w-5" />,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
    breadcrumbLabel: "Complaints",
  },
  SUGGESTIONS: {
    title: "Suggestion",
    detailsTitle: "Suggestion Details",
    icon: <Lightbulb className="h-5 w-5" />,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    breadcrumbLabel: "Suggestions",
  },
  ENQUIRY: {
    title: "Inquiry",
    detailsTitle: "Inquiry Details",
    icon: <HelpCircle className="h-5 w-5" />,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    breadcrumbLabel: "Inquiries",
  },
  RAIL_ANUBHAV: {
    title: "Experience",
    detailsTitle: "Experience Details",
    icon: <ThumbsUp className="h-5 w-5" />,
    colorClass: "text-green-600",
    bgClass: "bg-green-50",
    breadcrumbLabel: "Experiences",
  },
};
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

const AdminComplaintDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getComplaintById,
    updateComplaint,
    deleteComplaint,
    loading: complaintsLoading,
  } = useComplaints();
  const { user } = useAdminAuth();

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    isDeleting: false,
  });

  // Defer complaint fetching until loading is false
  const complaint = !complaintsLoading && id ? getComplaintById(id) : undefined;

  const [status, setStatus] = useState<Status>(
    complaint?.status || Status.REGISTERED
  );
  const [assignedTo, setAssignedTo] = useState(complaint?.assignedTo || "");
  const [department, setDepartment] = useState(complaint?.department || "");
  const [zone, setZone] = useState(complaint?.zone || "");

  useEffect(() => {
    if (complaint) {
      setStatus(complaint.status);
      setAssignedTo(complaint.assignedTo || "");
      setDepartment(complaint.department || "");
      setZone(complaint.zone || "");
    }
  }, [complaint]);

  // Get unique departments and zones for dropdowns
  const { departments, zones } = React.useMemo(() => {
    const allUsers = LocalAuthService.getAllUsers();
    const depts = Array.from(
      new Set(allUsers.map((u) => u.department).filter(Boolean))
    ) as string[];

    // Use official zones list combined with any custom zones from users
    const userZones = Array.from(
      new Set(allUsers.map((u) => u.zone).filter(Boolean))
    ) as string[];
    const officialZones = RAILWAY_ZONES.map((z) => z.zone);
    const zns = Array.from(new Set([...officialZones, ...userZones])).sort();

    return { departments: depts, zones: zns };
  }, []);

  // Get list of potential assignees based on role and filters
  const assignableUsers = React.useMemo(() => {
    if (!user) return [];
    const allUsers = LocalAuthService.getAllUsers();
    // Filter for only admins/officials
    let officials = allUsers.filter(
      (u) => u.role === Role.OFFICIAL || u.role === Role.SUPER_ADMIN
    );

    if (user.role === Role.SUPER_ADMIN) {
      // Apply filters if selected
      if (department) {
        officials = officials.filter((u) => u.department === department);
      }
      if (zone) {
        officials = officials.filter((u) => u.zone === zone);
      }
      return officials;
    }
    // Officials can only assign to their own department
    return officials.filter((u) => u.department === user.department);
  }, [user, department, zone]);

  const handleAutoAssign = () => {
    if (complaint?.analysis?.suggestedDepartment) {
      const suggestedDept = complaint.analysis.suggestedDepartment;
      setDepartment(suggestedDept);

      // Try to find an official in that department
      const allUsers = LocalAuthService.getAllUsers();
      const official = allUsers.find((u) => u.department === suggestedDept);

      if (official) {
        setAssignedTo(official.fullName || "");
        if (official.zone) setZone(official.zone);
      }
    }
  };

  if (complaintsLoading) {
    return (
      <LoadingScreen message="Loading complaint..." showAnimation={true} />
    );
  }

  if (!complaint) {
    return (
      <SuperAdminLayout
        activeTab="complaints"
        onTabChange={(tab: string) =>
          navigate(`/dashboard${tab !== "complaints" ? "?tab=" + tab : ""}`)
        }
      >
        <div className="text-center p-8">Complaint not found.</div>
      </SuperAdminLayout>
    );
  }

  // ... handle functions ...

  const handleUpdate = async () => {
    setIsSaving(true);
    await updateComplaint(complaint.id, {
      status,
      assignedTo,
      department,
      zone,
    });
    setTimeout(() => setIsSaving(false), 500); // simulate network delay
  };

  const handleEscalate = async () => {
    setIsSaving(true);
    // Escalation implies moving up or to a specialized department
    await updateComplaint(complaint.id, {
      status: Status.ESCALATED,
      assignedTo: assignedTo || "Senior Management",
      department: department || "Management",
      zone: zone,
    });
    setTimeout(() => setIsSaving(false), 500);
  };

  const handleForceStatus = async (newStatus: Status) => {
    if (
      !window.confirm(
        `⚠️ GOD MODE: Are you sure you want to FORCE the status to ${newStatus} ? This bypasses standard checks.`
      )
    ) {
      return;
    }
    setIsSaving(true);
    await updateComplaint(complaint.id, { status: newStatus });
    setStatus(newStatus); // Update local state immediately
    setIsSaving(false);
  };

  const handleDeleteComplaint = async () => {
    setIsDeleting(true);
    const success = await deleteComplaint(complaint.id);
    if (success) {
      navigate("/dashboard"); // Navigate back to dashboard after successful deletion
    } else {
      setIsDeleting(false); // Re-enable button if deletion failed
    }
  };

  const openDeleteModal = () => {
    setDeleteModal({ isOpen: true, isDeleting: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, isDeleting: false });
  };

  const confirmDelete = async () => {
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    const success = await deleteComplaint(complaint.id);

    if (success) {
      navigate("/dashboard");
    } else {
      setDeleteModal({ isOpen: false, isDeleting: false });
    }
  };

  const isActionDisabled =
    isSaving ||
    deleteModal.isDeleting ||
    complaint.status === Status.RESOLVED ||
    complaint.status === Status.CLOSED;

  // Get the configuration for this submission type
  const config =
    SUBMISSION_CONFIG[complaint.complaintArea] || SUBMISSION_CONFIG.TRAIN;
  const isComplaint =
    complaint.complaintArea === "TRAIN" ||
    complaint.complaintArea === "STATION";

  return (
    <SuperAdminLayout
      activeTab="complaints"
      onTabChange={(tab: string) => navigate("/dashboard")}
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="hover:text-amber-600 transition-colors"
          >
            Dashboard
          </button>
          <span>/</span>
          <button
            onClick={() => navigate("/dashboard")}
            className="hover:text-amber-600 transition-colors"
          >
            {config.breadcrumbLabel}
          </button>
          <span>/</span>
          <span className="font-medium text-slate-900 font-mono text-sm">
            {complaint.id}
          </span>
        </div>

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
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgClass} ${config.colorClass} border`}
                        >
                          {config.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            complaint.source === ComplaintSource.CHATBOT
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {complaint.source === ComplaintSource.CHATBOT
                            ? "🤖 Via Chatbot"
                            : "📝 Via Form"}
                        </span>
                      </div>
                      <CardTitle className="text-2xl">
                        {complaint.title}
                      </CardTitle>
                      <CardDescription>
                        <span className="font-mono">{complaint.id}</span> |
                        From: {complaint.complainantId}
                      </CardDescription>
                    </div>
                  </div>
                  <StatusBadge status={complaint.status} />
                </div>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-2">Full Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {complaint.description}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className={config.colorClass}>{config.icon}</span>
                  {config.detailsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {/* Only show complaint-specific fields for TRAIN/STATION */}
                {isComplaint ? (
                  <>
                    <div>
                      <Label>Area</Label>
                      <p className="font-medium">{complaint.complaintArea}</p>
                    </div>
                    <div>
                      <Label>PNR</Label>
                      <p className="font-medium">{complaint.pnr || "N/A"}</p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <Label>Train/Station Details</Label>
                      <p className="font-medium">
                        {complaint.complaintArea === "TRAIN"
                          ? complaint.description.match(
                              /train|express|rajdhani|shatabdi/i
                            )
                            ? complaint.description
                                .split("\n")
                                .find((line) => line.includes("Train")) ||
                              "Not specified"
                            : "Not specified"
                          : complaint.description.match(/station/i)
                          ? complaint.description
                              .split("\n")
                              .find((line) => line.includes("Station")) ||
                            "Not specified"
                          : "Not specified"}
                      </p>
                    </div>

                    <div>
                      <Label>Journey Date</Label>
                      <p className="font-medium">
                        {complaint.journeyDate
                          ? new Date(
                              complaint.journeyDate + "T00:00:00"
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label>Incident Date</Label>
                      <p className="font-medium">
                        {new Date(
                          complaint.incidentDate + "T00:00:00"
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <Label>Specific Location</Label>
                      <p className="font-medium">
                        {complaint.description.match(
                          /coach|berth|platform|seat|compartment/i
                        )
                          ? complaint.description
                              .split("\n")
                              .find((line) =>
                                line.match(
                                  /coach|berth|platform|seat|compartment/i
                                )
                              ) || "Not specified"
                          : "Not specified"}
                      </p>
                    </div>

                    <div>
                      <Label>Complaint Type</Label>
                      <p className="font-medium">{complaint.complaintType}</p>
                    </div>
                    <div>
                      <Label>Complaint Sub-Type</Label>
                      <p className="font-medium">
                        {complaint.complaintSubType}
                      </p>
                    </div>
                  </>
                ) : complaint.complaintArea === "SUGGESTIONS" ? (
                  /* Suggestion-specific layout */
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Suggestion Category</Label>
                      <p className="font-medium">{complaint.complaintType}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Suggestion Type</Label>
                      <p className="font-medium">
                        {complaint.complaintSubType}
                      </p>
                    </div>
                    <div>
                      <Label>Submitted On</Label>
                      <p className="font-medium">
                        {new Date(
                          complaint.incidentDate + "T00:00:00"
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {complaint.location && (
                      <div>
                        <Label>Related Location/Station</Label>
                        <p className="font-medium">{complaint.location}</p>
                      </div>
                    )}
                  </>
                ) : complaint.complaintArea === "ENQUIRY" ? (
                  /* Inquiry-specific layout */
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Inquiry Category</Label>
                      <p className="font-medium">{complaint.complaintType}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Inquiry Type</Label>
                      <p className="font-medium">
                        {complaint.complaintSubType}
                      </p>
                    </div>
                    <div>
                      <Label>Submitted On</Label>
                      <p className="font-medium">
                        {new Date(
                          complaint.incidentDate + "T00:00:00"
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {complaint.pnr && (
                      <div>
                        <Label>Related PNR</Label>
                        <p className="font-medium">{complaint.pnr}</p>
                      </div>
                    )}
                  </>
                ) : (
                  /* Rail Anubhav (Experience) layout */
                  <>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Experience Category</Label>
                      <p className="font-medium">{complaint.complaintType}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <Label>Experience Type</Label>
                      <p className="font-medium">
                        {complaint.complaintSubType}
                      </p>
                    </div>
                    <div>
                      <Label>Experience Date</Label>
                      <p className="font-medium">
                        {new Date(
                          complaint.incidentDate + "T00:00:00"
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {complaint.journeyDate && (
                      <div>
                        <Label>Journey Date</Label>
                        <p className="font-medium">
                          {new Date(
                            complaint.journeyDate + "T00:00:00"
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {complaint.location && (
                      <div>
                        <Label>Location</Label>
                        <p className="font-medium">{complaint.location}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Common fields for all types */}
                <div>
                  <Label>Assigned Official</Label>
                  <p className="font-medium">
                    {complaint.assignedTo || "Not assigned"}
                  </p>
                </div>
                <div>
                  <Label>Department</Label>
                  <p className="font-medium">{complaint.department || "N/A"}</p>
                </div>
                <div>
                  <Label>Zone</Label>
                  <p className="font-medium">{complaint.zone || "N/A"}</p>
                </div>
                <div>
                  <Label>Current Status</Label>
                  <StatusBadge status={complaint.status} />
                </div>

                <div>
                  <Label>Created Date</Label>
                  <p className="font-medium">
                    {new Date(complaint.createdAt).toLocaleDateString()} at{" "}
                    {new Date(complaint.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <p className="font-medium">
                    {new Date(complaint.updatedAt).toLocaleDateString()} at{" "}
                    {new Date(complaint.updatedAt).toLocaleTimeString()}
                  </p>
                </div>
              </CardContent>
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
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {complaint.analysis ? (
                  <>
                    <div>
                      <Label>AI-Verified Category</Label>
                      <p className="font-semibold text-primary">
                        {complaint.analysis.category}
                      </p>
                    </div>
                    {complaint.analysis.suggestedDepartment && (
                      <div>
                        <Label>AI-Suggested Department</Label>
                        <p className="font-semibold text-blue-600">
                          {complaint.analysis.suggestedDepartment}
                        </p>
                      </div>
                    )}
                    {/* Show urgency for complaints, priority for others */}
                    {isComplaint ? (
                      <div>
                        <Label>
                          Urgency Score ({complaint.analysis.urgencyScore}/10)
                        </Label>
                        <UrgencyIndicator
                          score={complaint.analysis.urgencyScore}
                        />
                      </div>
                    ) : (
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
                  </>
                ) : (
                  <div className="flex items-center text-muted-foreground">
                    <span>Analysis pending...</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="status">Update Status</Label>
                  <select
                    id="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as Status)}
                    className="w-full p-2 border rounded-md bg-background h-10"
                    disabled={isActionDisabled}
                  >
                    {Object.values(Status).map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Department & Zone Selection (Super Admin Only) */}
                {user?.role === Role.SUPER_ADMIN && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <select
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background h-10"
                        disabled={isActionDisabled}
                      >
                        <option value="">All Departments</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="zone">Zone</Label>
                      <select
                        id="zone"
                        value={zone}
                        onChange={(e) => setZone(e.target.value)}
                        className="w-full p-2 border rounded-md bg-background h-10"
                        disabled={isActionDisabled}
                      >
                        <option value="">All Zones</option>
                        {zones.map((z) => (
                          <option key={z} value={z}>
                            {z}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="assignedTo">Assign To Official</Label>
                    {complaint.analysis?.suggestedDepartment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-blue-600 hover:text-blue-700 px-2"
                        onClick={handleAutoAssign}
                        disabled={isActionDisabled}
                      >
                        ✨ Auto-Assign
                      </Button>
                    )}
                  </div>
                  <select
                    id="assignedTo"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full p-2 border rounded-md bg-background h-10"
                    disabled={isActionDisabled}
                  >
                    <option value="">Select Official...</option>
                    {assignableUsers.map((u) => (
                      <option key={u.id} value={u.fullName}>
                        {u.fullName} {u.department ? `(${u.department})` : ""}
                      </option>
                    ))}
                  </select>
                  {complaint.analysis?.suggestedDepartment && (
                    <div className="mt-1">
                      <p className="text-xs text-blue-600">
                        💡 AI recommends department:{" "}
                        {complaint.analysis.suggestedDepartment}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    onClick={handleUpdate}
                    className="w-full"
                    disabled={isActionDisabled}
                  >
                    {isSaving ? "Updating..." : "Update Complaint"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleEscalate}
                    className="w-full"
                    disabled={
                      isActionDisabled || complaint.status === Status.ESCALATED
                    }
                  >
                    {isSaving
                      ? "Escalating..."
                      : "Escalate to Higher Authority"}
                  </Button>

                  {/* Super Admin Actions - moved Delete here if not super admin, keeping standard delete for now, but hidden if SA panel is used? 
                                        Actually, let's keep standard delete as fallback, but hide it if we show the SA panel to avoid duplication? 
                                        Or just show 'Delete' here for everyone and SA panel has 'Force Delete'? 
                                        Task said "Move Delete Complaint button into this new card". 
                                        So we remove it from here if user is SA. */}
                  {(!user || user.role !== Role.SUPER_ADMIN) && (
                    <div className="border-t pt-4 mt-4">
                      <Button
                        variant="outline"
                        onClick={openDeleteModal}
                        className="w-full text-red-600 hover:text-red-700 hover:border-red-300 border-red-200"
                        disabled={isActionDisabled}
                      >
                        🗑️ Delete Complaint
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Super Admin God Mode Panel */}
            {user && user.role === Role.SUPER_ADMIN && (
              <Card className="border-red-200 bg-red-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
                      <ShieldAlert className="h-5 w-5" />
                      Super Admin Actions
                    </CardTitle>
                    <StatusBadge
                      status={Status.ESCALATED}
                      className="bg-red-100 text-red-800 border-red-200"
                    >
                      God Mode
                    </StatusBadge>
                  </div>
                  <CardDescription className="text-red-600/80 text-xs">
                    Overrides bypass all workflow validation. Use with caution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs font-bold text-red-700 uppercase mb-2 block">
                      Force Status Change
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceStatus(Status.REGISTERED)}
                        disabled={isSaving}
                        className="bg-white hover:bg-slate-50 text-slate-600 border-slate-200"
                      >
                        Reset (Pending)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceStatus(Status.IN_PROGRESS)}
                        disabled={isSaving}
                        className="bg-white hover:bg-blue-50 text-blue-600 border-blue-200"
                      >
                        In Progress
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceStatus(Status.RESOLVED)}
                        disabled={isSaving}
                        className="bg-white hover:bg-green-50 text-green-600 border-green-200"
                      >
                        Force Resolve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleForceStatus(Status.CLOSED)}
                        disabled={isSaving}
                        className="bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                      >
                        Force Close
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-red-100">
                    <Label className="text-xs font-bold text-red-700 uppercase mb-2 block">
                      Destructive Zone
                    </Label>
                    <Button
                      variant="destructive"
                      onClick={openDeleteModal}
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={isActionDisabled}
                    >
                      🗑️ Hard Delete Complaint
                    </Button>
                    <p className="text-[10px] text-red-500 mt-1 text-center">
                      Permanently removes from database. No undo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={closeDeleteModal}
          onConfirm={confirmDelete}
          title={complaint.title}
          complaintId={complaint.id}
          isLoading={deleteModal.isDeleting}
        />
      </div>
    </SuperAdminLayout>
  );
};

export default AdminComplaintDetailPage;
