import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  User,
  Mail,
  MessageSquareText,
  LoaderCircle,
  Phone,
  Shield,
  Activity,
  CalendarCheck,
  CalendarX,
} from "lucide-react";
import { createAuthenticatedApi } from "../../services/api";

const AccountInfoCard = () => {
  const { token } = useAuth();
  const [businessInfo, setBusinessInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusinessInfo = async () => {
      if (!token) return;
      // 3. Use the centralized helper to create the API instance
      const api = createAuthenticatedApi(token);
      try {
        // The URL is now simply '/auth/me' because the base URL is configured in the service
        const response = await api.get("/auth/me");
        setBusinessInfo(response.data);
      } catch (error) {
        console.error("Failed to fetch business info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBusinessInfo();
  }, [token]);

  if (isLoading) {
    return (
      <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg flex items-center justify-center min-h-[250px]">
        <LoaderCircle size={24} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  if (!businessInfo) {
    return (
      <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">Account Info</h2>
        <p className="text-red-500">Could not load account details.</p>
      </div>
    );
  }

  return (
    <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-6">Account <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Info</span></h2>
      <div className="space-y-5 text-neutral-300">
        {/* Business Name */}
        <div className="flex items-center gap-3" title="Business Name">
          <User size={18} className="text-cyan-400 flex-shrink-0" />
          <span className="truncate font-medium">{businessInfo.name}</span>
        </div>
        {/* Email */}
        <div className="flex items-center gap-3" title="Email">
          <Mail size={18} className="text-cyan-400 flex-shrink-0" />
          <span className="truncate">{businessInfo.email}</span>
        </div>
        {/* Phone Number (Optional) */}
        {businessInfo.phone && (
          <div className="flex items-center gap-3" title="Phone Number">
            <Phone size={18} className="text-cyan-400 flex-shrink-0" />
            <span className="truncate">{businessInfo.phone}</span>
          </div>
        )}
        {/* Role */}
        <div className="flex items-center gap-3" title="Role">
          <Shield size={18} className="text-cyan-400 flex-shrink-0" />
          <span className="truncate capitalize">{businessInfo.role}</span>
        </div>
        {/* Status */}
        <div className="flex items-center gap-3" title="Account Status">
          <Activity size={18} className="text-cyan-400 flex-shrink-0" />
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
              businessInfo.status === "active"
                ? "bg-green-900 text-green-300"
                : "bg-red-900 text-red-300"
            }`}
          >
            {businessInfo.status}
          </span>
        </div>
        {/* Activated On */}
        <div className="flex items-center gap-3" title="Activated On">
          <CalendarCheck size={18} className="text-cyan-400 flex-shrink-0" />
          <span>
            Joined on {new Date(businessInfo.createdAt).toLocaleDateString('en-IN')}
          </span>
        </div>
        {/* Plan Expiry */}
        <div className="flex items-center gap-3" title="Plan Expiry">
          <CalendarX size={18} className="text-cyan-400 flex-shrink-0" />
          <span>
            Plan expires on{" "}
            {businessInfo.planExpiry
              ? new Date(businessInfo.planExpiry).toLocaleDateString('en-IN')
              : "N/A"}
          </span>
        </div>
        {/* Credits Remaining */}
        <div
          className="flex items-center gap-3 pt-3 border-t border-neutral-800"
          title="Remaining Credits"
        >
          <MessageSquareText
            size={18}
            className="text-cyan-400 flex-shrink-0"
          />
          <div>
            <span className="font-bold text-white text-lg">
              {businessInfo.credits}
            </span>
            <span className="text-sm text-neutral-400"> Credits Remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountInfoCard;
