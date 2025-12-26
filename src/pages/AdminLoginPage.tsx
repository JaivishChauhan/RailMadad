import React, { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAdminAuth } from "../hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { Role } from "../types";
import { Shield, Lock, User, Eye, EyeOff } from "lucide-react";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState("super.admin@railmadad.demo");
  const [password, setPassword] = useState("super123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showTestCredentials, setShowTestCredentials] = useState(true);
  const { login, user, loading: authLoading } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Test credentials for demo
  const testCredentials = {
    admin: {
      email: "test.admin@railmadad.demo",
      password: "admin123",
      description: "Junior Admin (Restricted Access)",
    },
    superAdmin: {
      email: "super.admin@railmadad.demo",
      password: "super123",
      description: "Super Admin (System Control)",
    },
    moderator: {
      email: "test.moderator@railmadad.demo",
      password: "mod123",
      description: "Content Moderator",
    },
  };

  if (authLoading) {
    return (
      <LoadingScreen message="Verifying Admin Access..." showAnimation={true} />
    );
  }

  if (
    user &&
    (user.role === Role.OFFICIAL ||
      user.role === Role.SUPER_ADMIN ||
      user.role === Role.MODERATOR)
  ) {
    const fromPath = (location.state as any)?.from?.pathname || "/dashboard";
    const fromState = (location.state as any)?.from?.state || {};
    return <Navigate to={fromPath} replace state={fromState} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const authed = await login(email, password);

      if (authed) {
        const fromPath =
          (location.state as any)?.from?.pathname || "/dashboard";
        const fromState = (location.state as any)?.from?.state || {};
        setTimeout(() => {
          navigate(fromPath, { replace: true, state: fromState });
        }, 100);
      } else {
        setError("Access Denied. Invalid credentials.");
      }
    } catch (err: any) {
      setError(err?.message || "System Error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 transform rotate-3">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-white font-display">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Secure control panel for RailMadad systems
          </p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-xl text-slate-100 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold text-center text-white">
              Authenticate
            </CardTitle>
            <CardDescription className="text-center text-slate-400">
              Enter your official credentials
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4">
              {showTestCredentials && (
                <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-xs text-amber-500 uppercase tracking-wider">
                      Demo Credentials
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowTestCredentials(false)}
                      className="text-xs text-slate-500 hover:text-slate-300"
                    >
                      Dismiss
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(testCredentials.superAdmin.email);
                        setPassword(testCredentials.superAdmin.password);
                      }}
                      className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors group"
                    >
                      <div className="font-medium text-white group-hover:text-amber-400">
                        Super Admin
                      </div>
                      <div className="text-slate-500 truncate">Root Access</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(testCredentials.admin.email);
                        setPassword(testCredentials.admin.password);
                      }}
                      className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors group"
                    >
                      <div className="font-medium text-white group-hover:text-amber-400">
                        Official
                      </div>
                      <div className="text-slate-500 truncate">Restricted</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(testCredentials.moderator.email);
                        setPassword(testCredentials.moderator.password);
                      }}
                      className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 text-left transition-colors group"
                    >
                      <div className="font-medium text-white group-hover:text-amber-400">
                        Moderator
                      </div>
                      <div className="text-slate-500 truncate">Content</div>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Official ID
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9 bg-slate-900/50 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20 placeholder:text-slate-600"
                    placeholder="name@railmadad.gov.in"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  Secure Token
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-9 bg-slate-900/50 border-slate-700 text-slate-100 focus:border-amber-500 focus:ring-amber-500/20"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div className="p-3 rounded bg-red-900/20 border border-red-900/50 text-red-200 text-sm flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {error}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium py-6 shadow-lg shadow-orange-900/20 border-0"
                disabled={loading}
              >
                {loading ? "Authenticating..." : "Access Dashboard"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="text-center text-xs text-slate-500">
          Restricted System • Authorized Personnel Only • Monitor Protocol
          Active
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
