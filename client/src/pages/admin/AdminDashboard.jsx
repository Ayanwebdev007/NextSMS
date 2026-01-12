import React, { useState, useEffect } from "react";
import {
    Users,
    MessageSquare,
    Zap,
    Target,
    TrendingUp,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from "lucide-react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell
} from "recharts";
import { useAuth } from "../../hooks/useAuth";
import { createAuthenticatedApi } from "../../services/api";

const AdminDashboard = () => {
    const { token } = useAuth();
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const api = createAuthenticatedApi(token);
                const response = await api.get("/admin/dashboard-stats");
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [token]);

    if (isLoading) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    const { kpis, trends, recentActivity } = stats;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-white">System Overview</h1>
                <p className="text-neutral-400 mt-1">Real-time platform performance and business growth metrics.</p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Total Businesses", value: kpis.totalUsers, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10" },
                    { label: "Active Sessions", value: kpis.activeSessions, image: "/whatsapp-icon.png", color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Total Messages", value: kpis.totalSent, image: "/whatsapp-icon.png", color: "text-green-400", bg: "bg-green-500/10" },
                    { label: "Campaigns Run", value: kpis.totalCampaigns, icon: Target, color: "text-purple-400", bg: "bg-purple-400/10" }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl relative overflow-hidden group hover:border-neutral-700 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">{kpi.label}</p>
                                <h3 className="text-3xl font-black text-white mt-1">{kpi.value.toLocaleString()}</h3>
                            </div>
                            <div className={`${kpi.bg} ${kpi.color} p-3 rounded-xl`}>
                                {kpi.image ? (
                                    <img src={kpi.image} alt="WA" className="w-8 h-8 object-contain" />
                                ) : (
                                    <kpi.icon size={24} />
                                )}
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-green-400 uppercase tracking-tighter">
                            <TrendingUp size={12} />
                            <span>System Stable</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Message Volume Trend */}
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Activity className="text-cyan-400" size={18} />
                            Message Volume (7D)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends.messages}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis
                                    dataKey="_id"
                                    stroke="#525252"
                                    fontSize={10}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis stroke="#525252" fontSize={10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Area type="monotone" dataKey="sent" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorSent)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Growth */}
                <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TrendingUp className="text-purple-400" size={18} />
                            User Onboarding (7D)
                        </h3>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends.growth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                                <XAxis
                                    dataKey="_id"
                                    stroke="#525252"
                                    fontSize={10}
                                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                />
                                <YAxis stroke="#525252" fontSize={10} />
                                <Tooltip
                                    cursor={{ fill: '#171717' }}
                                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {trends.growth.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === trends.growth.length - 1 ? '#a855f7' : '#525252'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Global Activity */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-neutral-800 bg-neutral-950/50">
                    <h3 className="text-lg font-bold text-white">Global Activity Feed</h3>
                </div>
                <div className="divide-y divide-neutral-800">
                    {recentActivity.map((log) => (
                        <div key={log._id} className="p-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold ${log.event === 'connected' ? 'bg-green-500/10 text-green-400' :
                                    log.event === 'qr_generated' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                                    }`}>
                                    {log.event.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-white">{log.businessId?.name || "Deleted Business"}</p>
                                    <p className="text-xs text-neutral-500">{log.event.replace('_', ' ')} • {log.details}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-neutral-600 font-mono">{new Date(log.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                    {recentActivity.length === 0 && (
                        <div className="p-12 text-center text-neutral-600 italic">No global activity recorded yet.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
