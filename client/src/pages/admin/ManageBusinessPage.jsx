import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { LoaderCircle, Shield, User } from "lucide-react";
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
  const [updateType, setUpdateType] = useState("plan"); // "plan" or "custom"
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [customCredits, setCustomCredits] = useState("");

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

      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-800">
            <thead className="bg-neutral-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Credits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase text-center">Manage</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <button
                      onClick={() => handleOpenModal(business)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-2 mx-auto"
                    >
                      <Shield size={14} />
                      Plans
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- RECHARGE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-neutral-950 p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Update Account</h3>
                <p className="text-xs text-neutral-400 mt-1">{selectedBusiness?.name} ({selectedBusiness?.email})</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-500 hover:text-white">
                <Shield className="rotate-45" size={20} />
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
                className="flex-1 py-2.5 rounded-lg border border-neutral-800 text-white font-semibold hover:bg-neutral-800 transition-colors"
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
    </>
  );
};

export default ManageBusinessesPage;
