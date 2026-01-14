import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { Link } from "react-router-dom";
import { KeyRound, Copy, Check, LoaderCircle, ShieldAlert } from "lucide-react";
import ApiDocs from "../components/dashboard/ApiDocs";
import { createAuthenticatedApi } from "../services/api";

const ApiPage = () => {
  const { token, user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false); // State for the URL copy button

  useEffect(() => {
    if (user && user.apiKey) {
      setApiKey(user.apiKey);
    }
    setIsLoading(false);
  }, [user]);

  const handleGenerateKey = async () => {
    setIsGenerating(true);
    const toastId = toast.loading("Generating API Key...");
    const api = createAuthenticatedApi(token);
    try {
      const response = await api.post("/business/apikey");
      setApiKey(response.data.apiKey);
      toast.success("API Key is ready!", { id: toastId });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to generate API Key.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (textToCopy, type) => {
    navigator.clipboard.writeText(textToCopy);
    if (type === 'key') setCopiedKey(true);
    if (type === 'url') setCopiedUrl(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => {
      if (type === 'key') setCopiedKey(false);
      if (type === 'url') setCopiedUrl(false);
    }, 2000);
  };

  // --- THIS IS THE FIX ---
  // Derive the API URL dynamically to avoid hardcoded Render URLs
  const currentOrigin = window.location.origin;
  const apiBase = import.meta.env.VITE_API_BASE_URL || `${currentOrigin}/api`;
  const userPhone = user?.phone || "919876543210";

  const exampleUrl = `${apiBase}/whatsapp/send?receiver=${userPhone}&msgtext=Hello&mediaUrl=https://...&token=${apiKey || "YOUR_API_KEY"}`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoaderCircle size={32} className="animate-spin text-cyan-400" />
      </div>
    );
  }

  const renderContent = () => {
    if (user && user.credits > 100) {
      return (
        <div className="max-w-4xl bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-white">Your API Key</h2>
          <p className="text-neutral-400 mt-2">
            Use this permanent API key with our simple GET request endpoint. Keep
            this key secure.
          </p>
          {!apiKey ? (
            <button
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className="mt-6 w-full sm:w-1/2 flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white rounded-md h-12 font-semibold disabled:opacity-50"
            >
              <KeyRound size={20} />
              {isGenerating ? "Generating..." : "Generate API Key"}
            </button>
          ) : (
            <div className="mt-6">
              <p className="text-sm text-neutral-400 ">Your API Key:</p>
              <div className="mt-2 flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-md p-3">
                <code className="text-cyan-400 break-all flex-1">
                  {apiKey}
                </code>
                <button
                  onClick={() => handleCopy(apiKey, 'key')}
                  className="text-neutral-400 hover:text-white"
                >
                  {copiedKey ? (
                    <Check size={20} className="text-green-500" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>

              {/* The Example URL display is now back in the UI */}
              <p className="text-sm text-neutral-400 mt-6">Example API URL:</p>
              <div className="mt-2 flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-md p-3">
                <code className="text-green-400 break-all flex-1 text-xs">
                  {exampleUrl}
                </code>
                <button
                  onClick={() => handleCopy(exampleUrl, 'url')}
                  className="text-neutral-400 hover:text-white"
                >
                  {copiedUrl ? (
                    <Check size={20} className="text-green-500" />
                  ) : (
                    <Copy size={20} />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="max-w-4xl bg-black/80 backdrop-blur-sm border border-yellow-500/50 rounded-2xl p-8 shadow-lg text-center flex flex-col items-center">
        <ShieldAlert size={40} className="text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold text-white">Unlock API Access</h2>
        <p className="text-neutral-400 mt-2 max-w-lg">
          The REST API is a premium feature available for users with more than
          100 credits. Please purchase a larger plan to unlock this feature.
        </p>
        <Link
          to="/pricing"
          className="mt-6 inline-block bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-8 py-3 rounded-md font-semibold hover:opacity-90 transition-opacity"
        >
          View Plans
        </Link>
      </div>
    );
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 mt-16">
        REST <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">API</span>
      </h1>
      <p className="text-neutral-400 mb-8">
        Integrate NextSMS into your applications with our simple API.
      </p>

      {renderContent()}

      {user && user.credits > 100 && <ApiDocs apiKey={apiKey} userPhone={user?.phone} />}
    </div>
  );
};

export default ApiPage;

