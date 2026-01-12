import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { LoaderCircle, Inbox, Filter, X } from "lucide-react";
import { createAuthenticatedApi } from "../../services/api";

const ManageSubmissionsPage = () => {
  const { token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all submissions from the backend
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const api = createAuthenticatedApi(token);
      const response = await api.get("/admin/submissions");
      setSubmissions(response.data);
      setFilteredSubmissions(response.data); // Initially, show all
    } catch {
      toast.error("Could not load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Apply the date filter whenever the date or the original submissions change
  useEffect(() => {
    if (!filterDate) {
      setFilteredSubmissions(submissions); // If no date, show all
      return;
    }

    const selectedDate = new Date(filterDate);
    const filtered = submissions.filter((sub) => {
      const submissionDate = new Date(sub.createdAt);
      // Compare year, month, and day
      return (
        submissionDate.getFullYear() === selectedDate.getFullYear() &&
        submissionDate.getMonth() === selectedDate.getMonth() &&
        submissionDate.getDate() === selectedDate.getDate()
      );
    });
    setFilteredSubmissions(filtered);
  }, [filterDate, submissions]);

  const handleClearFilter = () => {
    setFilterDate("");
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Contact Form Inbox
        </h1>
        {/* --- NEW: Date Filter --- */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full pl-10 p-2.5"
            />
          </div>
          <button
            onClick={handleClearFilter}
            className="p-2.5 text-neutral-400 hover:text-white bg-neutral-800 rounded-lg"
            title="Clear Filter"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((sub) => (
            <div
              key={sub._id}
              className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg p-6 transition-all hover:border-cyan-400/50"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="text-lg font-semibold text-white">{sub.name}</p>
                  <a
                    href={`mailto:${sub.email}`}
                    className="text-sm text-cyan-400 hover:underline"
                  >
                    {sub.email}
                  </a>
                </div>
                <span className="text-xs text-neutral-500 flex-shrink-0">
                  {new Date(sub.createdAt).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <p className="text-neutral-300 whitespace-pre-wrap">
                  {sub.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-lg p-12">
            <Inbox size={48} className="mx-auto mb-4" />
            <p className="font-semibold">
              {filterDate
                ? "No submissions found for this date."
                : "Your inbox is empty."}
            </p>
            {filterDate && (
              <button
                onClick={handleClearFilter}
                className="mt-4 text-cyan-400 hover:underline text-sm"
              >
                Clear Filter
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default ManageSubmissionsPage;
