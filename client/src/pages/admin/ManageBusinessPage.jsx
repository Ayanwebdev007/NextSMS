import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { LoaderCircle, Shield, User, MoreVertical, Activity, Clock, CheckCircle2, XCircle, BarChart3, MessageSquare } from "lucide-react";
// 1. Import the centralized API helper
import { createAuthenticatedApi } from "../../services/api";

// 2. The local createApi helper has been removed.

const ManageBusinessesPage = () => {
  const { token } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityData, setActivityData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "messages", "connectivity"
  const [updateType, setUpdateType] = useState("plan"); // "plan" or "custom"
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      const api = createAuthenticatedApi(token);
      const response = await api.get("/admin/businesses");
      setBusinesses(response.data);
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
      setError("Could not load businesses.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    try {
      const api = createAuthenticatedApi(token);
      const response = await api.get("/admin/plans");
      setPlans(response.data);
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchBusinesses();
    fetchPlans();
  }, [fetchBusinesses, fetchPlans]);

  const handleStatusChange = async (businessId, newStatus) => {
    const toastId = toast.loading(`Updating status...`);
    try {
      const api = createAuthenticatedApi(token);
      await api.put(`/admin/businesses/${businessId}`, { status: newStatus });
      toast.success("Status updated!", { id: toastId });
      fetchBusinesses();
    } catch {
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  const handleOpenModal = (business) => {
    setSelectedBusiness(business);
    setCustomCredits(business.credits);
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  const handleOpenActivityModal = async (business) => {
    setSelectedBusiness(business);
    setIsActivityModalOpen(true);
    setOpenMenuId(null);
    setActivityData(null);
    setActiveTab("overview");

    try {
      const api = createAuthenticatedApi(token);
      const response = await api.get(`/admin/businesses/${business._id}/activity`);
      setActivityData(response.data);
    } catch (err) {
      toast.error("Failed to load activity details.");
    }
  };

  const handleUpdate = async () => {
    if (!selectedBusiness) return;

    const toastId = toast.loading("Updating account...");
    try {
      const api = createAuthenticatedApi(token);
      const payload = updateType === "plan"
        ? { planId: selectedPlanId }
        : { credits: parseInt(customCredits) };

      if (updateType === "plan" && !selectedPlanId) {
        toast.error("Please select a plan", { id: toastId });
        return;
      }

      await api.put(`/admin/businesses/${selectedBusiness._id}/credits`, payload);
      toast.success("Account updated successfully!", { id: toastId });
      setIsModalOpen(false);
      fetchBusinesses();
    } catch {
      toast.error("Failed to update account.", { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Manage Businesses</h1>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg">
        <div className="">
          <table className="min-w-full divide-y divide-neutral-800 rounded-lg">
            <thead className="bg-neutral-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-neutral-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {businesses.map((business) => (
                <tr key={business._id} className="hover:bg-neutral-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">{business.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">{business.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      onChange={(e) => handleStatusChange(business._id, e.target.value)}
                      value={business.status}
                      className="bg-neutral-800 border border-neutral-700 text-xs rounded p-1 text-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-cyan-400 font-bold">{business.credits}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">
                    {business.plan?.name || "Trial"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === business._id ? null : business._id)}
                      className="p-2 text-neutral-400 hover:text-white transition-colors"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openMenuId === business._id && (
                      <div className="absolute right-6 top-12 z-50 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl py-1 animate-in fade-in slide-in-from-top-2 duration-150">
                        <button
                          onClick={() => handleOpenModal(business)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                        >
                          <Shield size={16} className="text-cyan-400" />
                          Plans & Status
                        </button>
                        <button
                          onClick={() => handleOpenActivityModal(business)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
                        >
                          <BarChart3 size={16} className="text-yellow-400" />
                          Business Activity
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PLANS & CREDITS MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Update Account</h3>
                <p className="text-xs text-neutral-400 mt-1">{selectedBusiness?.name} ({selectedBusiness?.email})</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status Section */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Current Plan</p>
                  <p className="text-sm font-semibold text-cyan-400">{selectedBusiness?.plan?.name || "Trial Account"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Credits Remaining</p>
                  <p className="text-sm font-semibold text-white">{selectedBusiness?.credits}</p>
                </div>
                <div className="space-y-1 col-span-2 pt-2 border-t border-neutral-900">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Plan Expiry</p>
                  <p className="text-sm font-semibold text-neutral-300">
                    {selectedBusiness?.planExpiry ? new Date(selectedBusiness.planExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : "No Expiry"}
                  </p>
                </div>
              </div>

              {/* Type Selector Tabs */}
              <div className="flex bg-neutral-950 p-1 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setUpdateType("plan")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${updateType === "plan" ? "bg-cyan-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"}`}
                >
                  Assign Plan
                </button>
                <button
                  onClick={() => setUpdateType("custom")}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${updateType === "custom" ? "bg-cyan-600 text-white shadow-lg" : "text-neutral-400 hover:text-white"}`}
                >
                  Custom Credits
                </button>
              </div>

              {updateType === "plan" ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400">Select Subscription Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="">-- Choose a Plan --</option>
                    {plans.map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.credits} Credits - {p.validityDays} Days)</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 italic">Assigning a plan adds credits to the existing balance and sets the new expiry date.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-neutral-400">Override Total Credits</label>
                  <input
                    type="number"
                    value={customCredits}
                    onChange={(e) => setCustomCredits(e.target.value)}
                    placeholder="Enter manual credit amount"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                  <p className="text-xs text-neutral-500 italic">This will set the user's credits to exactly this number. It does not change the expiry date.</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-lg border border-neutral-800 text-white font-semibold hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 py-2.5 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-500 transition-all shadow-lg shadow-cyan-900/20"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BUSINESS ACTIVITY MODAL --- */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <img src="/whatsapp-icon.png" alt="WA" className="w-10 h-10 object-contain" />
                <div>
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">Business Activity Insights</h3>
                  <p className="text-xs text-neutral-400">{selectedBusiness?.name}'s live performance & history</p>
                </div>
              </div>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-neutral-500 hover:text-white p-2">
                <XCircle size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-neutral-950 px-6 border-b border-neutral-800 flex gap-6 overflow-x-auto no-scrollbar">
              {[
                { id: "overview", label: "Overview", icon: BarChart3 },
                { id: "messages", label: "Message Log", icon: MessageSquare },
                { id: "connectivity", label: "WhatsApp History", icon: Activity }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 border-b-2 text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "border-cyan-500 text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"}`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-grow overflow-y-auto p-6 scroll-smooth custom-scrollbar">
              {!activityData ? (
                <div className="flex flex-col items-center justify-center h-64 text-neutral-500 gap-4">
                  <LoaderCircle size={40} className="animate-spin text-cyan-500" />
                  <p className="text-sm">Fetching real-time insights...</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === "overview" && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Lifetime Sent</p>
                          <p className="text-3xl font-black text-white">{activityData.stats.totalSent}</p>
                          <div className="mt-2 h-1 w-full bg-neutral-900 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500" style={{ width: `${(activityData.stats.totalSent / (activityData.stats.totalSent + activityData.stats.totalFailed || 1)) * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl">
                          <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Active Campaigns</p>
                          <p className="text-3xl font-black text-cyan-400">{activityData.stats.campaignsCount}</p>
                        </div>
                        <div className="bg-neutral-950 border border-neutral-800 p-5 rounded-xl">
                          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1">Failed Rate</p>
                          <p className="text-3xl font-black text-red-500">
                            {((activityData.stats.totalFailed / (activityData.stats.totalSent + activityData.stats.totalFailed || 1)) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <Clock className="text-cyan-400" size={18} />
                          Recent Campaigns
                        </h4>
                        <div className="space-y-3">
                          {activityData.recentCampaigns.length > 0 ? activityData.recentCampaigns.map(camp => (
                            <div key={camp._id} className="bg-neutral-950/50 border border-neutral-800/50 p-4 rounded-xl flex items-center justify-between hover:border-neutral-700 transition-colors">
                              <div>
                                <p className="text-sm font-bold text-white">{camp.name}</p>
                                <p className="text-xs text-neutral-500">{new Date(camp.createdAt).toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${camp.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                  {camp.status}
                                </span>
                                <p className="text-xs text-neutral-400 mt-1">{camp.sentCount} sent • {camp.failedCount} failed</p>
                              </div>
                            </div>
                          )) : <p className="text-sm text-neutral-600 text-center py-8">No campaigns created yet.</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: MESSAGES */}
                  {activeTab === "messages" && (
                    <div className="space-y-4">
                      {activityData.recentMessages.length > 0 ? (
                        <div className="border border-neutral-800 rounded-xl overflow-hidden overflow-x-auto">
                          <table className="min-w-full divide-y divide-neutral-800">
                            <thead className="bg-neutral-950">
                              <tr>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase">Recipient</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-[10px] font-bold text-neutral-500 uppercase">Message Preview</th>
                                <th className="px-4 py-3 text-right text-[10px] font-bold text-neutral-500 uppercase">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                              {activityData.recentMessages.map(msg => (
                                <tr key={msg._id} className="bg-neutral-950/20 hover:bg-neutral-950/40">
                                  <td className="px-4 py-3 text-sm text-white font-medium">{msg.recipient}</td>
                                  <td className="px-4 py-3">
                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${msg.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                                      {msg.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                      {msg.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-neutral-400 max-w-[200px] truncate">{msg.content}</td>
                                  <td className="px-4 py-3 text-right text-[10px] text-neutral-500 font-mono">
                                    {new Date(msg.createdAt).toLocaleTimeString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-sm text-neutral-600 text-center py-12">No recent messages found.</p>}
                    </div>
                  )}

                  {/* TAB 3: CONNECTIVITY */}
                  {activeTab === "connectivity" && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-3 h-3 rounded-full animate-pulse ${selectedBusiness?.sessionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-bold text-white uppercase tracking-wider">
                          Live Status: {selectedBusiness?.sessionStatus}
                        </p>
                      </div>

                      <div className="relative space-y-8 before:absolute before:inset-0 before:ml-4 before:-translate-x-1/2 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-cyan-500/50 before:via-neutral-800 before:to-transparent">
                        {activityData.connectivityHistory.length > 0 ? activityData.connectivityHistory.map((log, idx) => (
                          <div key={log._id} className="relative flex items-center gap-6 group">
                            <div className={`absolute left-0 w-8 h-8 -translate-x-1/2 rounded-full border-4 border-neutral-900 flex items-center justify-center z-10 ${log.event === 'connected' ? 'bg-green-500 text-white' : log.event === 'qr_generated' ? 'bg-yellow-500 text-black' : 'bg-red-500 text-white'}`}>
                              {log.event === 'connected' ? <CheckCircle2 size={14} /> : log.event === 'qr_generated' ? <Shield size={14} /> : <XCircle size={14} />}
                            </div>
                            <div className="ml-8 bg-neutral-950/40 border border-neutral-800 p-4 rounded-xl flex-grow group-hover:border-neutral-700 transition-all duration-300">
                              <div className="flex justify-between items-start mb-1">
                                <h5 className="text-sm font-bold text-white uppercase tracking-wide capitalize">
                                  {log.event.replace('_', ' ')}
                                </h5>
                                <span className="text-[10px] font-mono text-neutral-500">
                                  {new Date(log.timestamp).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-neutral-400 italic">"{log.details}"</p>
                            </div>
                          </div>
                        )) : <p className="text-sm text-neutral-600 text-center py-12">No connectivity logs yet.</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 bg-neutral-950 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => setIsActivityModalOpen(false)}
                className="px-6 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-all"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ManageBusinessesPage;
