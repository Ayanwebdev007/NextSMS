import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import {
  LoaderCircle,
  CheckCircle,
  XCircle,
  Inbox,
  Clock,
  CalendarClock,
  AlertCircle,
} from "lucide-react"; // 1. Import new icons
import { createAuthenticatedApi } from "../services/api";

// --- NEW: A dedicated component for displaying campaign status ---
const CampaignStatusIndicator = ({ status }) => {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400">
          <CheckCircle size={14} /> Completed
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 animate-pulse">
          <Clock size={14} /> Processing
        </span>
      );
    case "scheduled":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
          <CalendarClock size={14} /> Scheduled
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
          <AlertCircle size={14} /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
          <LoaderCircle size={14} className="animate-spin" /> Pending
        </span>
      );
  }
};

const OutboxPage = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaigns, setCampaigns] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const api = createAuthenticatedApi(token);
    try {
      const [campaignsRes, messagesRes] = await Promise.all([
        api.get("/history/campaigns"),
        api.get("/history/messages"),
      ]);
      setCampaigns(campaignsRes.data);
      setMessages(messagesRes.data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError("Could not load outbox history. Please try again later.");
      toast.error("Could not load outbox history.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const renderCampaignsTable = () => (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Campaign Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Progress
              </th>
              {/* 2. Updated table header for clarity */}
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Created / Scheduled On
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {campaigns.map((c) => (
              <tr key={c._id} className="hover:bg-neutral-800/50">
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {c.name}
                </td>
                <td className="px-6 py-4 text-sm capitalize">
                  {/* 3. Use the new status indicator component */}
                  <CampaignStatusIndicator status={c.status} />
                </td>
                <td className="px-6 py-4 text-sm">
                  {/* 4. Show a different message for scheduled campaigns */}
                  {c.status === "scheduled" ? (
                    <span className="text-neutral-500">Waiting to send...</span>
                  ) : (
                    <>
                      <span className="text-green-400">{c.sentCount} Sent</span>{" "}
                      /
                      <span className="text-red-400">
                        {" "}
                        {c.failedCount} Failed
                      </span>{" "}
                      /
                      <span className="text-neutral-400">
                        {" "}
                        {c.totalMessages} Total
                      </span>
                    </>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-400">
                  {/* 5. Intelligently display the correct date */}
                  {c.scheduledAt
                    ? new Date(c.scheduledAt).toLocaleString("en-IN")
                    : new Date(c.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {campaigns.length === 0 && (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <Inbox size={40} className="mb-4" />
            <p>You haven't sent any campaigns yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderMessagesTable = () => (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-800">
          <thead className="bg-neutral-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Recipient
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {messages.map((m) => (
              <tr key={m._id} className="hover:bg-neutral-800/50">
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {m.recipient}
                </td>
                <td className="px-6 py-4 text-sm text-neutral-300 truncate max-w-xs">
                  {m.content}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      m.status === "sent" ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {m.status === "sent" ? (
                      <CheckCircle size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {m.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-neutral-400">
                  {new Date(m.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {messages.length === 0 && (
          <div className="p-12 text-center text-neutral-500 flex flex-col items-center">
            <Inbox size={40} className="mb-4" />
            <p>You haven't sent any single messages yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
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
    return activeTab === "campaigns"
      ? renderCampaignsTable()
      : renderMessagesTable();
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 mt-14">
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500 ">
          Outbox
        </span>
      </h1>

      <div className="mb-6 border-b border-neutral-800">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab("campaigns")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "campaigns"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-white hover:border-neutral-700"
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "messages"
                ? "border-cyan-400 text-cyan-400"
                : "border-transparent text-neutral-400 hover:text-white hover:border-neutral-700"
            }`}
          >
            Single Messages
          </button>
        </nav>
      </div>

      {renderContent()}
    </>
  );
};

export default OutboxPage;
