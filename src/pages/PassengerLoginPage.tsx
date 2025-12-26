import React, { useState } from "react";
import { useNavigate, useLocation, Navigate, Link } from "react-router-dom";
import { usePassengerAuth } from "../hooks/usePassengerAuth";
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
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Label } from "@/components/ui/label";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { Role } from "../types";

const PassengerLoginPage: React.FC = () => {
  const { login, user, loading: authLoading } = usePassengerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("passenger@demo.com");
  const [password, setPassword] = useState("demo123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return <LoadingScreen message="Loading..." showAnimation={true} />;
  }

  if (user && user.role === Role.PASSENGER) {
    const fromPath = (location.state as any)?.from?.pathname || "/status";
    const fromState = (location.state as any)?.from?.state || {};
    return <Navigate to={fromPath} replace state={fromState} />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        const fromPath = (location.state as any)?.from?.pathname || "/status";
        navigate(fromPath, { replace: true });
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail("passenger@demo.com");
    setPassword("demo123");
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Passenger Login</CardTitle>
          <CardDescription>
            Sign in to submit and track your railway complaints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700 font-medium mb-2">
              🎭 Demo Mode
            </p>
            <p className="text-xs text-blue-600 mb-2">
              Use any email/password to login - accounts are auto-created.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={fillDemoCredentials}
            >
              Use Demo Credentials
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground text-center">
            Don't have an account?{" "}
            <Link
              to="/passenger-register"
              className="text-primary hover:underline"
            >
              Register here
            </Link>
          </p>
          <p className="text-xs text-muted-foreground text-center">
            <Link to="/admin-login" className="text-primary hover:underline">
              Admin Login →
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default PassengerLoginPage;
