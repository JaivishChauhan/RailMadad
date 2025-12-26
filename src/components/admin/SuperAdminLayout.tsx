import React from "react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { useNavigate } from "react-router-dom";
import {
  Users,
  BarChart3,
  ShieldAlert,
  Settings,
  FileText,
  LogOut,
  Menu,
  Shield,
  Bell,
  Search,
  MessageSquare,
  HelpCircle,
  MapPin,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Role } from "../../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "info" | "warning" | "success" | "error";
}

interface SuperAdminLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  searchQuery?: string;
  onSearch?: (query: string) => void;
  notifications?: Notification[];
  onMarkAllRead?: () => void;
}

const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  searchQuery = "",
  onSearch,
  notifications = [],
  onMarkAllRead,
}) => {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/admin-login");
  };

  const navItems = [
    {
      id: "dashboard",
      label: "Command Center",
      icon: BarChart3,
      roles: [Role.SUPER_ADMIN, Role.OFFICIAL, Role.MODERATOR],
    },
    {
      id: "complaints",
      label: "Complaints",
      icon: FileText,
      roles: [Role.SUPER_ADMIN, Role.OFFICIAL, Role.MODERATOR],
    },
    {
      id: "rail-anubhav",
      label: "Rail Anubhav",
      icon: MessageSquare,
      roles: [Role.SUPER_ADMIN, Role.OFFICIAL, Role.MODERATOR],
    },
    {
      id: "enquiry",
      label: "Enquiry",
      icon: HelpCircle,
      roles: [Role.SUPER_ADMIN, Role.OFFICIAL, Role.MODERATOR],
    },
    {
      id: "suggestions",
      label: "User Suggestions",
      icon: Lightbulb,
      roles: [Role.SUPER_ADMIN, Role.OFFICIAL, Role.MODERATOR],
    },
    { id: "users", label: "Team", icon: Users, roles: [Role.SUPER_ADMIN] },
    {
      id: "system",
      label: "System Health",
      icon: ShieldAlert,
      roles: [Role.SUPER_ADMIN],
    },
    {
      id: "settings",
      label: "Configuration",
      icon: Settings,
      roles: [Role.SUPER_ADMIN],
    },
  ];

  const visibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarOpen ? "w-64" : "w-20"
        } bg-primary text-primary-foreground transition-all duration-300 flex flex-col fixed h-full z-20`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-4 border-b border-secondary">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            {isSidebarOpen && (
              <div className="font-bold text-lg tracking-tight">
                <span className="text-white">Rail</span>
                <span className="text-white/80">Madad</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-2 space-y-1">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-white text-primary shadow-lg"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive ? "text-primary" : "text-white/70"
                  }`}
                />
                {isSidebarOpen && (
                  <span className="font-medium text-sm">{item.label}</span>
                )}
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-secondary">
          <div
            className={`flex items-center gap-3 ${
              !isSidebarOpen && "justify-center"
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-primary-foreground/20">
              <span className="text-sm font-bold text-primary-foreground">
                {user?.fullName?.charAt(0) || "A"}
              </span>
            </div>
            {isSidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.fullName || "Admin User"}
                </p>
                <p className="text-xs text-primary-foreground/60 truncate">
                  {user?.role === Role.SUPER_ADMIN
                    ? "Super Admin"
                    : "Railway Official"}
                </p>
              </div>
            )}
            {isSidebarOpen && (
              <button
                onClick={handleLogout}
                className="p-1.5 text-primary-foreground/70 hover:text-red-300 hover:bg-secondary rounded transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? "ml-64" : "ml-20"
        } flex flex-col min-h-screen`}
      >
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border sticky top-0 z-10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-muted rounded-lg text-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="font-semibold text-foreground">
              {visibleNavItems.find((i) => i.id === activeTab)?.label ||
                "Dashboard"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Bar - Global Admin Search */}
            <div className="relative hidden md:block w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search complaints, users..."
                value={searchQuery}
                onChange={(e) => onSearch && onSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 text-foreground"
              />
            </div>

            <div className="h-8 w-px bg-border mx-2" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors outline-none">
                  <Bell className="h-5 w-5" />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-card" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {notifications.length > 0 && (
                    <span
                      className="text-xs text-primary cursor-pointer hover:underline"
                      onClick={onMarkAllRead}
                    >
                      Mark all read
                    </span>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">
                            {notification.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {notification.time}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 absolute top-3 right-2" />
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="p-6 flex-1 overflow-auto bg-background">{children}</div>
      </main>
    </div>
  );
};

export default SuperAdminLayout;
