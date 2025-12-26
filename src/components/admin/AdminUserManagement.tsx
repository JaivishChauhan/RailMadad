import React, { useState, useEffect } from "react";
// Demo mode: use local auth service instead of Supabase for creating/listing admins
import { LocalAuthService } from "../../services/localAuthService";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { Role } from "../../types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingScreen } from "../ui/LoadingScreen";
import { StatusBadge } from "../ui/StatusBadge";
import { UserFormModal } from "./UserFormModal";
import { Edit, Trash2, Plus, ShieldAlert, UserCheck } from "lucide-react";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  employee_id: string;
  department: string;
  station_code?: string;
  zone?: string;
  role: Role;
  created_at?: string;
}

const AdminUserManagement: React.FC = () => {
  const { user } = useAdminAuth();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Only SUPER_ADMIN can access user management
  if (!user || user.role !== Role.SUPER_ADMIN) {
    return (
      <div className="text-center py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-4 text-red-600">
            <ShieldAlert className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-600">
            This user management feature is only available to Super
            Administrators.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    try {
      // Local demo: pull all users and filter by role OFFICIAL or SUPER_ADMIN
      const users = LocalAuthService.getAllUsers();
      const adminsLocal = users
        .filter((u) => u.role === "OFFICIAL" || u.role === "SUPER_ADMIN")
        .map((u) => ({
          id: u.id,
          email: u.email,
          full_name: u.fullName || "",
          employee_id: u.employeeId || "",
          department: u.department || "",
          station_code: u.stationCode || "",
          zone: u.zone || "",
          role: u.role,
          created_at: undefined, // Local users don't have this yet
        }));
      setAdmins(adminsLocal);
    } catch (err) {
      console.error("Error in fetchAdmins (local):", err);
      setError("Failed to load admin users");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (formData: any) => {
    try {
      if (LocalAuthService.emailExists(formData.email)) {
        throw new Error("Email already exists");
      }

      const newUser = LocalAuthService.register({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        fullName: formData.fullName,
        employeeId: formData.employeeId,
        department: formData.department,
        stationCode: formData.stationCode || undefined,
        zone: formData.zone || undefined,
      } as any);

      if (!newUser) throw new Error("Failed to create user");

      setSuccess(`User ${formData.email} created successfully`);
      fetchAdmins();
    } catch (err: any) {
      console.error("Create Error", err);
      throw err; // Propagate to modal
    }
  };

  const handleUpdateUser = async (formData: any) => {
    if (!editingUser) return;
    try {
      const updated = LocalAuthService.updateUser(editingUser.id, {
        fullName: formData.fullName,
        employeeId: formData.employeeId,
        department: formData.department,
        role: formData.role,
        stationCode: formData.stationCode,
        zone: formData.zone,
      });

      if (!updated) throw new Error("Failed to update user");

      setSuccess(`User ${editingUser.email} updated successfully`);
      fetchAdmins();
    } catch (err: any) {
      throw err;
    }
  };

  const handleFormSubmit = async (formData: any) => {
    if (editingUser) {
      await handleUpdateUser(formData);
    } else {
      await handleCreateUser(formData);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  };

  const openEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setIsModalOpen(true);
    setError("");
    setSuccess("");
  };

  const handleDeleteAdmin = async (adminId: string, email: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the admin account for ${email}?`
      )
    ) {
      return;
    }

    try {
      const ok = LocalAuthService.deleteUser(adminId);
      if (!ok) {
        throw new Error("Failed to delete user (Protected user or error)");
      }
      setSuccess("User deleted successfully");
      fetchAdmins();
    } catch (err: any) {
      console.error("Error deleting admin:", err);
      setError(err.message || "Failed to delete user");
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading users..." showAnimation={true} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Team Management
          </h2>
          <p className="text-slate-500">
            Manage access and roles for railway officials.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add New Official
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          {success}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Official Directory ({admins.length})</CardTitle>
          <CardDescription>
            List of all registered administrators and their operational scope.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.length === 0 ? (
              <p className="text-center py-8 text-slate-500">
                No admin users found.
              </p>
            ) : (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="group flex items-center justify-between p-4 border rounded-lg hover:border-amber-200 hover:bg-amber-50/30 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900">
                        {admin.full_name}
                      </h3>
                      <StatusBadge
                        className={
                          admin.role === Role.SUPER_ADMIN
                            ? "bg-purple-100 text-purple-800 hover:bg-purple-100"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        }
                      >
                        {admin.role === Role.SUPER_ADMIN
                          ? "Super Admin"
                          : "Junior Admin"}
                      </StatusBadge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm text-slate-600">
                      <p>
                        <strong>ID:</strong> {admin.employee_id}
                      </p>
                      <p>
                        <strong>Email:</strong> {admin.email}
                      </p>
                      <p>
                        <strong>Dept:</strong> {admin.department}
                      </p>
                      <p>
                        <strong>Zone/Stn:</strong> {admin.zone || "N/A"} /{" "}
                        {admin.station_code || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(admin)}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>

                    {LocalAuthService.isProtectedUser(admin.id) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="text-gray-400 cursor-not-allowed"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <UserFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingUser}
        isEditing={!!editingUser}
      />
    </div>
  );
};

export default AdminUserManagement;
