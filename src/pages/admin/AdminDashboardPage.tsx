import React, { useState, useMemo, useEffect } from "react";
import { useComplaints } from "../../hooks/useComplaints";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import type { Complaint } from "../../types";
import { Status, ComplaintSource, Role } from "../../types";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmationModal } from "../../components/ui/DeleteConfirmationModal";
import { RefreshIcon } from "../../components/icons/Icons";
import AdminUserManagement from "../../components/admin/AdminUserManagement";
import SuperAdminPanel from "../../components/admin/SuperAdminPanel";
import SuperAdminLayout from "../../components/admin/SuperAdminLayout";
import SystemHealthPanel from "../../components/admin/SystemHealthPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Activity,
  Clock,
  CheckCircle,
  AlertTriangle,
  MapPin,
  TrendingUp,
  FileText,
  Settings,
} from "lucide-react";

const AdminDashboardPage: React.FC = () => {
  const { complaints, loading, deleteComplaint, refreshComplaints } =
    useComplaints();
  const { user } = useAdminAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [sourceFilter, setSourceFilter] = useState<ComplaintSource | "ALL">(
    "ALL"
  );
  const [sortBy, setSortBy] = useState<"urgency" | "date">("date");
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    complaint: Complaint | null;
    isDeleting: boolean;
  }>({
    isOpen: false,
    complaint: null,
    isDeleting: false,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([
    {
      id: "1",
      title: "New High Priority Complaint",
      message: "A new complaint regarding safety has been reported.",
      time: "5m ago",
      read: false,
      type: "warning" as const,
    },
    {
      id: "2",
      title: "System Update",
      message: "System maintenance scheduled for tonight.",
      time: "1h ago",
      read: false,
      type: "info" as const,
    },
    {
      id: "3",
      title: "Complaint Resolved",
      message: "Complaint #12345 has been marked as resolved.",
      time: "2h ago",
      read: true,
      type: "success" as const,
    },
  ]);

  const handleMarkAllRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };

  // Redirect if trying to access restricted tabs
  useEffect(() => {
    if (user && user.role !== Role.SUPER_ADMIN) {
      if (["users", "system", "settings"].includes(activeTab)) {
        setActiveTab("dashboard");
      }
    }
  }, [activeTab, user]);

  // Calculate Dashboard Stats
  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(
      (c) => c.status === Status.PENDING || c.status === Status.IN_PROGRESS
    ).length;
    const resolved = complaints.filter(
      (c) => c.status === Status.RESOLVED
    ).length;
    const critical = complaints.filter(
      (c) => (c.analysis?.urgencyScore || 0) > 8
    ).length;

    // SLA Breach (Mock: older than 24h & not resolved)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const breached = complaints.filter(
      (c) => c.status !== Status.RESOLVED && new Date(c.createdAt) < yesterday
    ).length;

    return { total, pending, resolved, critical, breached };
  }, [complaints]);

  const filteredAndSortedComplaints = useMemo(() => {
    let result = [...complaints];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.description.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query) ||
          (c.pnr && c.pnr.includes(query))
      );
    }

    if (statusFilter !== "ALL") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (sourceFilter !== "ALL") {
      result = result.filter((c) => c.source === sourceFilter);
    }

    if (sortBy === "date") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sortBy === "urgency") {
      result.sort(
        (a, b) =>
          (b.analysis?.urgencyScore || 0) - (a.analysis?.urgencyScore || 0)
      );
    }

    return result;
  }, [complaints, statusFilter, sourceFilter, sortBy]);

  /**
   * Filter complaints by complaintArea to separate suggestions, enquiries, rail-anubhav from regular complaints.
   * This ensures each section displays only its relevant entries.
   */
  const regularComplaints = useMemo(
    () =>
      filteredAndSortedComplaints.filter(
        (c) =>
          c.complaintArea !== "SUGGESTIONS" &&
          c.complaintArea !== "ENQUIRY" &&
          c.complaintArea !== "RAIL_ANUBHAV"
      ),
    [filteredAndSortedComplaints]
  );

  const suggestionsComplaints = useMemo(
    () =>
      filteredAndSortedComplaints.filter(
        (c) => c.complaintArea === "SUGGESTIONS"
      ),
    [filteredAndSortedComplaints]
  );

  const enquiryComplaints = useMemo(
    () =>
      filteredAndSortedComplaints.filter((c) => c.complaintArea === "ENQUIRY"),
    [filteredAndSortedComplaints]
  );

  const railAnubhavComplaints = useMemo(
    () =>
      filteredAndSortedComplaints.filter(
        (c) => c.complaintArea === "RAIL_ANUBHAV"
      ),
    [filteredAndSortedComplaints]
  );

  const handleDeleteComplaint = async (id: string) => {
    const success = await deleteComplaint(id);
    if (success) console.log("Complaint deleted successfully");
  };

  /**
   * Renders a reusable complaints table with filtering, sorting and actions.
   * @param items - The list of complaints to display
   * @param emptyMessage - Message shown when no items match filters
   * @param title - The section title
   * @returns JSX element containing the table
   */
  const renderComplaintsTable = (
    items: Complaint[],
    emptyMessage: string,
    title: string
  ) => (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left text-muted-foreground">
              <th className="p-4 font-medium">ID</th>
              <th className="p-4 font-medium">Title</th>
              <th className="p-4 font-medium">Source</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Urgency</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((c: Complaint) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-mono text-xs text-slate-500">{c.id}</td>
                <td className="p-4 font-medium text-slate-900 max-w-xs truncate">
                  {c.title}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      c.source === ComplaintSource.CHATBOT
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {c.source === ComplaintSource.CHATBOT ? "Chatbot" : "Form"}
                  </span>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                    {c.analysis?.category || "General"}
                  </span>
                </td>
                <td className="p-4">
                  <span
                    className={`font-bold ${
                      (c.analysis?.urgencyScore || 0) > 7
                        ? "text-red-600"
                        : (c.analysis?.urgencyScore || 0) > 4
                        ? "text-amber-600"
                        : "text-green-600"
                    }`}
                  >
                    {c.analysis?.urgencyScore || "N/A"}
                  </span>
                </td>
                <td className="p-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="p-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/dashboard/complaint/${c.id}`)}
                    >
                      Manage
                    </Button>
                    {user?.role === Role.SUPER_ADMIN && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDeleteModal(c)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground bg-slate-50/50">
            <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
              <FileText className="h-full w-full" />
            </div>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  );

  const openDeleteModal = (complaint: Complaint) => {
    setDeleteModal({ isOpen: true, complaint, isDeleting: false });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, complaint: null, isDeleting: false });
  };

  const confirmDelete = async () => {
    if (!deleteModal.complaint) return;
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));
    const success = await deleteComplaint(deleteModal.complaint.id);
    if (success) {
      closeDeleteModal();
    } else {
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Render Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Complaints
              </p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">
                {stats.total}
              </h3>
            </div>
            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Pending Action
              </p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">
                {stats.pending}
              </h3>
            </div>
            <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Resolved
              </p>
              <h3 className="text-2xl font-bold mt-1 text-slate-800">
                {stats.resolved}
              </h3>
              <p className="text-xs text-green-600 mt-1 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> +12% this week
              </p>
            </div>
            <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Critical / Breach
              </p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold mt-1 text-red-600">
                  {stats.critical}
                </h3>
                <span className="text-xs text-red-400 font-medium">
                  ({stats.breached} SLA)
                </span>
              </div>
            </div>
            <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                Live Operations Stream
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredAndSortedComplaints.slice(0, 5).map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100"
                  >
                    <div
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        (c.analysis?.urgencyScore || 0) > 7
                          ? "bg-red-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={c.status} />
                        <span className="text-xs text-slate-500">
                          {c.id} • {new Date(c.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/dashboard/complaint/${c.id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
                {filteredAndSortedComplaints.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-amber-500" />
                Hotspots
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  "Mumbai Central",
                  "New Delhi",
                  "Howrah Jn",
                  "Chennai Egmore",
                ].map((station, i) => (
                  <div
                    key={station}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium text-slate-300">
                      {station}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${80 - i * 15}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {80 - i * 15}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-700">
                <h4 className="text-sm font-medium text-slate-400 mb-3">
                  System Health
                </h4>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm text-green-400">
                    All Systems Operational
                  </span>
                </div>
                <p className="text-xs text-slate-500">Last check: 2 mins ago</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <SuperAdminLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearch={setSearchQuery}
      notifications={notifications}
      onMarkAllRead={handleMarkAllRead}
    >
      {/* Dashboard View */}
      {activeTab === "dashboard" && renderDashboard()}

      {/* Complaints Management View */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Active Complaints
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as "urgency" | "date")
                  }
                  className="p-2 text-sm border-none bg-slate-100 rounded-md focus:ring-2 focus:ring-amber-500"
                >
                  <option value="date">Most Recent</option>
                  <option value="urgency">Highest Urgency</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as Status | "ALL")
                  }
                  className="p-2 text-sm border-none bg-slate-100 rounded-md focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ALL">All Status</option>
                  {Object.values(Status).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={refreshComplaints}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshIcon
                  className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr className="text-left text-muted-foreground">
                    <th className="p-4 font-medium">ID</th>
                    <th className="p-4 font-medium">Title</th>
                    <th className="p-4 font-medium">Source</th>
                    <th className="p-4 font-medium">Category</th>
                    <th className="p-4 font-medium">Urgency</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {regularComplaints.map((c: Complaint) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {c.id}
                      </td>
                      <td className="p-4 font-medium text-slate-900 max-w-xs truncate">
                        {c.title}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.source === ComplaintSource.CHATBOT
                              ? "bg-blue-50 text-blue-700 border border-blue-100"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {c.source === ComplaintSource.CHATBOT
                            ? "Chatbot"
                            : "Form"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-slate-100 text-slate-700">
                          {c.analysis?.category || "General"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`font-bold ${
                            (c.analysis?.urgencyScore || 0) > 7
                              ? "text-red-600"
                              : (c.analysis?.urgencyScore || 0) > 4
                              ? "text-amber-600"
                              : "text-green-600"
                          }`}
                        >
                          {c.analysis?.urgencyScore || "N/A"}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/dashboard/complaint/${c.id}`)
                            }
                          >
                            Manage
                          </Button>
                          {user?.role === Role.SUPER_ADMIN && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteModal(c)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {regularComplaints.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-slate-50/50">
                  <div className="mx-auto h-12 w-12 text-slate-300 mb-3">
                    <FileText className="h-full w-full" />
                  </div>
                  <p>No complaints found matching your filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Management View */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle
                  className="h-5 w-5 text-amber-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm text-amber-700">
                  You are in <span className="font-bold">Super Admin Mode</span>
                  . Changes to staff roles and permissions are applied
                  immediately.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <AdminUserManagement />
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm">
            <SuperAdminPanel />
          </div>
        </div>
      )}

      {/* System Health View */}
      {activeTab === "system" && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <SystemHealthPanel />
        </div>
      )}

      {/* Settings / Configuration View */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 rounded-lg border shadow-sm">
          <SuperAdminPanel />
        </div>
      )}

      {/* Rail Anubhav View */}
      {activeTab === "rail-anubhav" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Rail Anubhav ({railAnubhavComplaints.length})
            </h2>
            <p className="text-muted-foreground text-sm">
              Manage passenger experiences and feedback
            </p>
          </div>
          {renderComplaintsTable(
            railAnubhavComplaints,
            "No Rail Anubhav entries found",
            "Rail Anubhav"
          )}
        </div>
      )}

      {/* Enquiry View */}
      {activeTab === "enquiry" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              Enquiry Management ({enquiryComplaints.length})
            </h2>
            <p className="text-muted-foreground text-sm">
              Handle general enquiries and information requests
            </p>
          </div>
          {renderComplaintsTable(
            enquiryComplaints,
            "No enquiries found",
            "Enquiry"
          )}
        </div>
      )}

      {/* Suggestions View */}
      {activeTab === "suggestions" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
            <h2 className="text-xl font-bold tracking-tight">
              User Suggestions ({suggestionsComplaints.length})
            </h2>
            <p className="text-muted-foreground text-sm">
              Review and act on user suggestions for improvement
            </p>
          </div>
          {renderComplaintsTable(
            suggestionsComplaints,
            "No suggestions found",
            "Suggestions"
          )}
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        title={deleteModal.complaint?.title || ""}
        complaintId={deleteModal.complaint?.id || ""}
        isLoading={deleteModal.isDeleting}
      />
    </SuperAdminLayout>
  );
};

export default AdminDashboardPage;
