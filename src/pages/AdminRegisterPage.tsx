import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";

const AdminRegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    employeeId: "",
    department: "",
    stationCode: "",
    zone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const adminAuth = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(
      "Admin registration is not available in demo mode. Use preset credentials: test.admin@railmadad.demo / admin123"
    );
    setLoading(false);
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create Admin Account</CardTitle>
          <CardDescription>Register as a Railway Official</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@railmadad.com"
                required
                value={formData.email}
                onChange={handleInputChange("email")}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                required
                value={formData.password}
                onChange={handleInputChange("password")}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                required
                value={formData.fullName}
                onChange={handleInputChange("fullName")}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                type="text"
                placeholder="EMP001"
                required
                value={formData.employeeId}
                onChange={handleInputChange("employeeId")}
                disabled={loading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                type="text"
                placeholder="IT Administration"
                required
                value={formData.department}
                onChange={handleInputChange("department")}
                disabled={loading}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Admin Account"}
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
};

export default AdminRegisterPage;
