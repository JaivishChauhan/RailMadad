import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Server,
  Database,
  Activity,
  RefreshCw,
  Power,
  CheckCircle,
  AlertCircle,
  XCircle,
  Bot,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  getRateLimitStatus,
  resetRateLimit,
  getActiveProvider,
  getPrioritizedProviders,
  type AIProvider,
} from "../../config/aiConfig";

// --- Types ---
type StatusType = "operational" | "degraded" | "outage";

interface DayStatus {
  date: string;
  status: StatusType;
}

interface ServiceHealth {
  name: string;
  uptimeHistory: DayStatus[]; // Renamed from uptime90Days
  currentStatus: StatusType;
  uptimePercentage: number;
}

interface MetricPoint {
  time: string;
  value: number;
}

// --- Mock Data Generators ---

const generateLast30Days = (): DayStatus[] => {
  const days: DayStatus[] = [];
  const today = new Date();
  // Generate 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const rand = Math.random();
    let status: StatusType = "operational";
    // Make it slightly more stable than before to look realistic
    if (rand > 0.96) status = "degraded";
    if (rand > 0.99) status = "outage";

    days.push({
      date: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), // Format: 12 Oct
      status,
    });
  }
  return days;
};

// Real Indian Railway Services
const servicesList = [
  "PRS (Passenger Reservation System)",
  "NTES (National Train Enquiry System)",
  "RailMadad AI Engine",
  "UTS (Unreserved Ticketing)",
  "IRCTC Payment Gateway",
  "Freight Operations Interface",
  "Crew Management System",
  "Station Master Sync Grid",
];

const generateServiceData = (): ServiceHealth[] => {
  return servicesList.map((name) => {
    const history = generateLast30Days();

    // Inject specific "incidents" for realism
    if (name.includes("AI Engine")) {
      // Simulated degraded perf 2 days ago
      history[28].status = "degraded";
    }
    if (name.includes("Payment")) {
      // Simulated tiny blip
      if (Math.random() > 0.5) history[15].status = "degraded";
    }

    const operationalCount = history.filter(
      (d) => d.status === "operational"
    ).length;
    const uptime = (operationalCount / 30) * 100;

    return {
      name,
      uptimeHistory: history,
      currentStatus: history[history.length - 1].status,
      uptimePercentage: uptime,
    };
  });
};

const generateLatencyData = (
  baseVal: number,
  variance: number
): MetricPoint[] => {
  const data: MetricPoint[] = [];
  for (let i = 0; i < 24; i++) {
    data.push({
      time: `${i}:00`,
      value:
        baseVal +
        Math.floor(Math.random() * variance * (Math.random() > 0.5 ? 1 : -1)),
    });
  }
  return data;
};

// --- Components ---

const UptimeStrip: React.FC<{ history: DayStatus[] }> = ({ history }) => {
  return (
    <div className="flex gap-[3px] h-10 w-full items-end">
      {history.map((day, i) => {
        let color = "bg-emerald-400/90";
        if (day.status === "degraded") color = "bg-amber-400";
        if (day.status === "outage") color = "bg-red-500";

        return (
          <div
            key={i}
            className={`group relative flex-1 rounded-sm ${color} hover:bg-opacity-100 hover:scale-y-110 transition-all cursor-pointer`}
            style={{ height: "100%" }}
          >
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 whitespace-nowrap">
              <div className="bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg flex flex-col items-center">
                <span className="font-semibold">{day.date}</span>
                <span className="capitalize text-slate-300">{day.status}</span>
              </div>
              {/* Arrow */}
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-800 mx-auto"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ServiceRow: React.FC<{ service: ServiceHealth }> = ({ service }) => {
  const statusColor =
    service.currentStatus === "operational"
      ? "text-emerald-600"
      : service.currentStatus === "degraded"
      ? "text-amber-600"
      : "text-red-600";

  return (
    <div className="py-5 border-b last:border-0 hover:bg-slate-50/50 transition-colors px-2 -mx-2 rounded">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-slate-800">{service.name}</h3>
        </div>
        <div
          className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-opacity-10 ${
            service.currentStatus === "operational"
              ? "bg-emerald-100 text-emerald-700"
              : service.currentStatus === "degraded"
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {service.currentStatus === "operational"
            ? "Operational"
            : service.currentStatus === "degraded"
            ? "Issues"
            : "Outage"}
        </div>
      </div>

      <UptimeStrip history={service.uptimeHistory} />

      <div className="flex justify-between items-center mt-3 text-[11px] text-slate-400 uppercase tracking-wider font-medium">
        <span>30 days ago</span>
        <span className="text-slate-600">
          {service.uptimePercentage.toFixed(1)}% uptime
        </span>
        <span>Today</span>
      </div>
    </div>
  );
};

// Simple toggle component
const BooleanToggle = ({
  check,
  onChange,
  label,
}: {
  check: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) => (
  <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 max-w-full">
    <div className="space-y-0.5">
      <div className="text-sm font-medium text-slate-900">{label}</div>
      <div className="text-xs text-slate-500">
        {check ? "Enabled" : "Disabled"}
      </div>
    </div>
    <button
      onClick={() => onChange(!check)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
        check ? "bg-amber-600" : "bg-slate-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          check ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const SystemHealthPanel: React.FC = () => {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Initial Data
  const services = useMemo(() => generateServiceData(), []);
  // Mock latency for regions/services
  const pnrLatency = useMemo(() => generateLatencyData(120, 40), []); // PNR is heavy
  const bookingLatency = useMemo(() => generateLatencyData(350, 80), []); // IRCTC is heavier
  const aiLatency = useMemo(() => generateLatencyData(45, 10), []); // AI is fast

  useEffect(() => {
    const isMaintenance =
      localStorage.getItem("RAILMADAD_MAINTENANCE_MODE") === "true";
    setMaintenanceMode(isMaintenance);
  }, []);

  const handleMaintenanceToggle = (enabled: boolean) => {
    setMaintenanceMode(enabled);
    if (enabled) {
      localStorage.setItem("RAILMADAD_MAINTENANCE_MODE", "true");
    } else {
      localStorage.removeItem("RAILMADAD_MAINTENANCE_MODE");
    }
    window.dispatchEvent(new Event("storage"));
  };

  const refreshMetrics = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-2">
      {/* Header Section */}
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Rail Network Health
          </h2>
          <p className="text-slate-500 text-sm">
            Live status of critical railway infrastructure services.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-sm font-medium text-emerald-600 hidden sm:inline-block">
            CRIS Systems Operational
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshMetrics}
            disabled={refreshing}
            className="ml-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Service Status Bars */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="py-4 border-b bg-slate-50/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2 text-slate-800">
                <Activity className="h-4 w-4 text-emerald-600" />
                30-Day Service Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-1">
                {services.map((s) => (
                  <ServiceRow key={s.name} service={s} />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Graphs */}
          <div>
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex justify-between items-center">
              <span>Platform Latency Metrics</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-500">
                      PNR Enquiry (Avg)
                    </h4>
                    <span className="text-sm font-bold text-blue-600">
                      120 ms
                    </span>
                  </div>
                  <div className="h-[100px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pnrLatency}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                        />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={["dataMin - 20", "dataMax + 20"]} />
                        <Tooltip contentStyle={{ fontSize: "12px" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between mb-4">
                    <h4 className="text-sm font-medium text-slate-500">
                      Chatbot AI Response
                    </h4>
                    <span className="text-sm font-bold text-emerald-600">
                      45 ms
                    </span>
                  </div>
                  <div className="h-[100px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={aiLatency}>
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={["dataMin - 10", "dataMax + 10"]} />
                        <Tooltip contentStyle={{ fontSize: "12px" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Info */}
        <div className="space-y-6">
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900 text-lg">
                <AlertTriangle className="h-5 w-5" />
                Master Override
              </CardTitle>
              <CardDescription className="text-amber-700">
                Global availability controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BooleanToggle
                label="Maintenance Mode"
                check={maintenanceMode}
                onChange={handleMaintenanceToggle}
              />
              <div className="bg-amber-100/50 p-3 rounded border border-amber-200 text-xs text-amber-800 leading-relaxed">
                <strong>Caution:</strong> Enabling this will redirect all
                passenger traffic to the 'Under Maintenance' screen. Admin
                access remains unaffected.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Server Load (Mumbai)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between text-xs uppercase text-slate-500 font-semibold mb-2">
                    <span>Ticketing CPU</span>
                    <span className="text-slate-700">78%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[78%] relative overflow-hidden">
                      <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase text-slate-500 font-semibold mb-2">
                    <span>Redis Cache</span>
                    <span className="text-slate-700">42%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 w-[42%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs uppercase text-slate-500 font-semibold mb-2">
                    <span>DB IOPS</span>
                    <span className="text-slate-700">65%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 w-[65%]"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-slate-100 border-slate-800">
            <CardHeader className="pb-3 border-b border-slate-800">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-400" />
                CRIS Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Data Center</span>
                <span className="font-mono text-xs bg-slate-800 px-2 py-1 rounded">
                  CRIS-NDLS-01
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Cluster Status</span>
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Healthy
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Nodes</span>
                <span>32 / 32</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Active Connections</span>
                <span>12,450</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 mt-2">
                <span className="text-slate-500 text-xs">Last Sync</span>
                <span className="text-slate-500 text-xs">
                  06 Oct, 14:32 IST
                </span>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Health & Configuration */}
          <AIProviderHealthCard />
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const AIProviderHealthCard: React.FC = () => {
  const [status, setStatus] = useState(getRateLimitStatus());
  const [activeProvider, setActiveProvider] = useState(getActiveProvider());
  const [prioritizedChain, setPrioritizedChain] = useState(
    getPrioritizedProviders()
  );

  const refreshStatus = () => {
    setStatus(getRateLimitStatus());
    setActiveProvider(getActiveProvider());
    setPrioritizedChain(getPrioritizedProviders());
  };

  // Auto-refresh every 30 seconds to update countdowns
  useEffect(() => {
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReset = (provider: AIProvider) => {
    resetRateLimit(provider);
    refreshStatus();
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return "0m";
    const mins = Math.ceil(ms / 60000);
    return `${mins}m`;
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 border-indigo-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-600" />
            AI Provider Health
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
          </Button>
        </div>
        <CardDescription>
          Real-time status of AI models and fallback logic.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Provider Indicator */}
        <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-md border border-indigo-100">
          <span className="text-sm font-medium text-indigo-900">
            Active Provider
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
            {activeProvider || "None"}
          </span>
        </div>

        {/* Provider Status List */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Provider Status
          </div>

          {/* Gemini Status */}
          <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status.gemini.isRateLimited ? "bg-red-500" : "bg-emerald-500"
                }`}
              ></div>
              <span className="text-sm font-medium">Google Gemini</span>
            </div>
            {status.gemini.isRateLimited ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">
                  Rate Limited ({formatTime(status.gemini.remainingTimeMs)})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleReset("gemini")}
                >
                  Reset
                </Button>
              </div>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">
                Operational
              </span>
            )}
          </div>

          {/* OpenRouter Status */}
          <div className="flex items-center justify-between p-2 rounded border border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  status.openrouter.isRateLimited
                    ? "bg-red-500"
                    : "bg-emerald-500"
                }`}
              ></div>
              <span className="text-sm font-medium">OpenRouter</span>
            </div>
            {status.openrouter.isRateLimited ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">
                  Rate Limited ({formatTime(status.openrouter.remainingTimeMs)})
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => handleReset("openrouter")}
                >
                  Reset
                </Button>
              </div>
            ) : (
              <span className="text-xs text-emerald-600 font-medium">
                Operational
              </span>
            )}
          </div>
        </div>

        {/* Fallback Chain Visualization */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Current Fallback Chain
          </div>
          <div className="flex flex-col gap-1">
            {prioritizedChain.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-xs text-slate-600"
              >
                <span className="font-mono text-slate-400">{index + 1}.</span>
                <span className="capitalize font-medium">{item.provider}</span>
                <span className="text-slate-400">-</span>
                <span className="truncate max-w-[150px]" title={item.modelId}>
                  {item.modelId}
                </span>
                {item.isFree && (
                  <span className="ml-auto text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    FREE
                  </span>
                )}
              </div>
            ))}
            {prioritizedChain.length === 0 && (
              <div className="text-xs text-red-500 italic">
                No available providers!
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthPanel;
