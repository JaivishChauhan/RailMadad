import React, { useState, useEffect } from "react";
// UserFormModal component for creating/editing users
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { Role } from "../../types";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: any) => Promise<void>;
  initialData?: any;
  isEditing?: boolean;
}

const ZONES = [
  "Central Railway",
  "Eastern Railway",
  "Northern Railway",
  "North Eastern Railway",
  "Northeast Frontier Railway",
  "Southern Railway",
  "South Central Railway",
  "South Eastern Railway",
  "South East Central Railway",
  "Western Railway",
  "North Western Railway",
  "West Central Railway",
  "East Central Railway",
  "North Central Railway",
  "East Coast Railway",
  "South Western Railway",
];

const DEPARTMENTS = [
  "Station Management",
  "Train Operations",
  "Security",
  "Engineering",
  "Signal & Telecom",
  "Commercial",
  "Medical",
  "Catering",
  "Cleanliness",
  "Customer Care",
  "Administration",
];

export const UserFormModal: React.FC<UserFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isEditing = false,
}) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    role: Role.OFFICIAL,
    stationCode: "",
    zone: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData && isEditing) {
        setFormData({
          fullName: initialData.full_name || "",
          email: initialData.email || "",
          employeeId: initialData.employee_id || "",
          department: initialData.department || "",
          role: initialData.role || Role.OFFICIAL,
          stationCode: initialData.station_code || "",
          zone: initialData.zone || "",
          password: "", // Don't pre-fill password
        });
      } else {
        setFormData({
          fullName: "",
          email: "",
          employeeId: "",
          department: "",
          role: Role.OFFICIAL,
          stationCode: "",
          zone: "",
          password: "",
        });
      }
      setError("");
    }
  }, [isOpen, initialData, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit form");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
          <CardTitle>
            {isEditing ? "Edit Admin User" : "Create New Admin User"}
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  required
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  disabled={isEditing} // Email usually immutable as it's often the ID/login
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input
                  id="employeeId"
                  required
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">System Role *</Label>
                <select
                  id="role"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value as Role })
                  }
                >
                  <option value={Role.OFFICIAL}>Junior Admin (Official)</option>
                  <option value={Role.SUPER_ADMIN}>Super Admin</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <select
                  id="department"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  required
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Railway Zone</Label>
                <select
                  id="zone"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.zone}
                  onChange={(e) =>
                    setFormData({ ...formData, zone: e.target.value })
                  }
                >
                  <option value="">Select Zone</option>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stationCode">Station Code</Label>
                <Input
                  id="stationCode"
                  placeholder="e.g. NDLS"
                  value={formData.stationCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stationCode: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Initial Password *</Label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={6}
                    placeholder="Min 6 chars"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading
                  ? "Saving..."
                  : isEditing
                  ? "Update User"
                  : "Create User"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
