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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBusinesses = useCallback(async () => {
    setIsLoading(true);
    try {
      // 3. Use the production-ready API service
      const api = createAuthenticatedApi(token);
      const response = await api.get("/admin/businesses");
      setBusinesses(response.data);
    } catch (err) {
      console.error("Failed to fetch businesses:", err);
      setError("Could not load businesses. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  const handleStatusChange = async (businessId, newStatus) => {
    const toastId = toast.loading(`Updating status to ${newStatus}...`);
    try {
      const api = createAuthenticatedApi(token);
      await api.put(`/admin/businesses/${businessId}`, { status: newStatus });
      toast.success("Status updated successfully!", { id: toastId });
      fetchBusinesses();
    } catch {
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 bg-red-950 border border-red-800 p-4 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
        Manage Businesses
      </h1>
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-neutral-800">
            <thead className="bg-neutral-950">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Status</th>
                {/* --- NEW TABLE HEADERS --- */}
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Current Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Plan Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {businesses.map((business) => (
                <tr key={business._id} className="hover:bg-neutral-800/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{business.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300">{business.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${ business.status === "active" ? "bg-green-900 text-green-300" : business.status === "suspended" ? "bg-red-900 text-red-300" : "bg-yellow-900 text-yellow-300" }`}>
                      {business.status}
                    </span>
                  </td>
                  {/* --- NEW TABLE DATA CELLS --- */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-300 font-medium">
                    {business.plan ? business.plan.name : <span className="text-neutral-500">Trial</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-400">
                    {business.planExpiry ? new Date(business.planExpiry).toLocaleDateString('en-IN') : <span className="text-neutral-500">N/A</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="relative">
                      <select
                        onChange={(e) => handleStatusChange(business._id, e.target.value)}
                        value={business.status}
                        className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2"
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default ManageBusinessesPage;

