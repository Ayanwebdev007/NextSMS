import React, { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Papa from "papaparse";
import { createAuthenticatedApi } from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import SampleDownloadModal from "../components/campaign/SampleDownloadModal";

// UI Components
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";

import {
  Rocket,
  ChevronLeft,
  FileUp,
  CheckCircle,
  Paperclip,
  X,
  LoaderCircle,
  Wifi,
  WifiOff,
  Braces,
  Plus,
} from "lucide-react";

const ToggleSwitch = ({ enabled, setEnabled }) => (
  <div
    onClick={() => setEnabled(!enabled)}
    className={`flex items-center w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? "bg-cyan-500 justify-end" : "bg-neutral-700 justify-start"
      }`}
  >
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
      className="w-4 h-4 bg-white rounded-full"
    />
  </div>
);

const CampaignsPage = () => {
  const { token, user } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      message: ""
    }
  });

  const messageText = watch("message");
  const navigate = useNavigate();

  const [recipientCount, setRecipientCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [recipients, setRecipients] = useState([]);
  const fileInputRef = useRef(null);

  const [uploadedMediaPath, setUploadedMediaPath] = useState(null);
  const [mediaFileName, setMediaFileName] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef(null);
  const [availablePlaceholders, setAvailablePlaceholders] = useState([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [speed, setSpeed] = useState("safe"); // express, safe, ultra-safe
  const [globalPlaceholders, setGlobalPlaceholders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPlaceholders = async () => {
    try {
      const api = createAuthenticatedApi(token);
      const response = await api.get('/placeholders');
      setGlobalPlaceholders(response.data);
    } catch (error) {
      console.error("Failed to fetch placeholders", error);
    }
  };

  useEffect(() => {
    fetchPlaceholders();
  }, [token]);

  const totalPlaceholders = Array.from(new Set([
    ...availablePlaceholders,
    ...globalPlaceholders.map(p => p.name)
  ]));

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const toastId = toast.loading("Processing file...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields || [];
        const placeholders = headers.filter(h => h !== 'PhoneNumber');
        setAvailablePlaceholders(placeholders);

        const processedData = result.data
          .map((row) => {
            const phoneNumber = row.PhoneNumber ? row.PhoneNumber.toString().replace(/\D/g, "") : "";
            const variables = { ...row };
            delete variables.PhoneNumber;
            return { phoneNumber, variables };
          })
          .filter((item) => item.phoneNumber && item.phoneNumber.length >= 10);

        if (processedData.length === 0) {
          toast.error(
            "No valid recipients found. Ensure your CSV has a 'PhoneNumber' column.",
            { id: toastId }
          );
          setFileName("");
          setRecipientCount(0);
          setRecipients([]);
          setAvailablePlaceholders([]);
        } else {
          setRecipients(processedData);
          setRecipientCount(processedData.length);
          toast.success(
            `${processedData.length} recipients successfully extracted.`,
            { id: toastId }
          );
        }
        if (fileInputRef.current) fileInputRef.current.value = null;
      },
      error: (error) => {
        toast.error("Failed to parse the file.", { id: toastId });
        console.error("PapaParse Error:", error);
        setFileName("");
        if (fileInputRef.current) fileInputRef.current.value = null;
      },
    });
  };

  const handleMediaFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingMedia(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append("media", file);

    try {
      const api = createAuthenticatedApi(token);
      const response = await api.post("/media/upload", formData);
      setUploadedMediaPath(response.data.filePath);
      setMediaFileName(file.name);
      toast.success("Media file attached successfully!", { id: toastId });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "File upload failed.";
      toast.error(errorMessage, { id: toastId });
      setMediaFileName("");
      setUploadedMediaPath(null);
    } finally {
      setIsUploadingMedia(false);
      if (mediaFileInputRef.current) {
        mediaFileInputRef.current.value = null;
      }
    }
  };

  const handleRemoveMediaFile = () => {
    setMediaFileName("");
    setUploadedMediaPath(null);
    if (mediaFileInputRef.current) {
      mediaFileInputRef.current.value = null;
    }
  };

  const onSubmit = async (data) => {
    if (!user || user.sessionStatus !== "connected") {
      toast.error(
        "Your WhatsApp is not connected. Please connect your device first."
      );
      return;
    }
    if (recipients.length === 0) {
      toast.error("Please upload a file with recipients first.");
      return;
    }
    if (isScheduled && (!scheduledAt || new Date(scheduledAt) <= new Date())) {
      toast.error("Please select a valid future date and time for scheduling.");
      return;
    }

    const toastId = toast.loading(
      isScheduled ? "Scheduling your campaign..." : "Starting your campaign..."
    );
    const api = createAuthenticatedApi(token);

    try {
      let delay = 0;
      if (isScheduled) {
        delay = new Date(scheduledAt).getTime() - Date.now();
      }

      const delayMap = {
        'express': { min: 2000, max: 5000 },
        'safe': { min: 5000, max: 12000 },
        'ultra-safe': { min: 10000, max: 25000 }
      };
      const { min: minDelay, max: maxDelay } = delayMap[speed];

      await api.post("/campaign/start", {
        name: data.campaignName,
        recipients: recipients,
        message: data.message,
        filePath: uploadedMediaPath,
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
        delay: delay > 0 ? delay : 0,
        minDelay,
        maxDelay
      });

      const successMessage = isScheduled
        ? `Campaign successfully scheduled for ${new Date(
          scheduledAt
        ).toLocaleString("en-IN")}`
        : `Campaign started! ${recipients.length} messages are being sent.`;

      toast.success(successMessage, { id: toastId });
      navigate("/dashboard");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to start campaign.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  const isLaunchDisabled =
    isSubmitting || isUploadingMedia || user?.sessionStatus !== "connected";

  const getRootUrl = () => {
    const base = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://nextsms-backend.onrender.com';
    return base.replace(/\/api$/, '').replace(/\/$/, '');
  };
  const API_URL = getRootUrl();

  const WhatsAppPreview = () => {
    // 🔗 Live Personalization for the first recipient
    let previewContent = messageText || "Type your message below...";

    // Create a mock variable set for preview if no CSV is uploaded
    const mockVars = {};
    globalPlaceholders.forEach(p => mockVars[p.name] = `[${p.name}]`);

    if (recipients.length > 0 && recipients[0].variables) {
      const vars = recipients[0].variables;
      previewContent = previewContent.replace(/{{(\w+)}}/g, (match, key) => {
        return vars[key] !== undefined ? vars[key] : match;
      });
    } else {
      // Show sample values for custom variables if no CSV loaded
      previewContent = previewContent.replace(/{{(\w+)}}/g, (match, key) => {
        return mockVars[key] !== undefined ? mockVars[key] : match;
      });
    }

    return (
      <div className="sticky top-8 border-[6px] border-neutral-800 rounded-[3rem] p-1 bg-neutral-900 shadow-2xl w-full max-w-[300px] mx-auto flex flex-col overflow-hidden ring-1 ring-neutral-700">
        <div className="bg-[#0b141a] w-full h-full rounded-[2.5rem] flex flex-col overflow-hidden">
          {/* Phone Header */}
          <div className="bg-[#202c33] px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center">
                <Wifi size={16} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none">Campaign Preview</span>
                <span className="text-[9px] text-[#8696a0] mt-1">online</span>
              </div>
            </div>
          </div>

          {/* Chat Background */}
          <div className="flex-1 p-3 overflow-y-auto space-y-4 relative" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}>
            <div className="self-end ml-auto bg-[#005c4b] text-[#e9edef] rounded-lg p-2 max-w-[90%] shadow-md relative mt-4">
              {/* Message Content */}
              <div className="space-y-2">
                {uploadedMediaPath && (
                  <div className="rounded overflow-hidden -mx-1 -mt-1 mb-2">
                    <img
                      src={`${API_URL}/${uploadedMediaPath}`}
                      alt="Media Preview"
                      className="w-full h-auto object-cover max-h-[150px]"
                    />
                  </div>
                )}
                <p className="text-[12px] whitespace-pre-wrap leading-relaxed break-words">
                  {previewContent}
                </p>
              </div>

              {/* Timestamp & Status */}
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-[9px] text-[#8696a0]">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex opacity-80">
                  <CheckCircle size={10} className="text-cyan-400" />
                </div>
              </div>

              {/* Bubble Tail */}
              <div className="absolute top-0 -right-1.5 w-0 h-0 border-t-[10px] border-t-[#005c4b] border-r-[10px] border-r-transparent"></div>
            </div>

            {recipients.length > 0 && (
              <div className="mx-auto text-center bg-black/40 backdrop-blur-md rounded px-2 py-1 absolute bottom-4 left-0 right-0">
                <p className="text-[8px] text-neutral-400 italic">Showing preview for recipient #1: {recipients[0].phoneNumber}</p>
              </div>
            )}
          </div>

          {/* Phone Footer */}
          <div className="bg-[#202c33] p-4 flex items-center gap-3">
            <div className="flex-1 h-9 bg-[#2a3942] rounded-full px-4 flex items-center">
              <span className="text-[11px] text-[#8696a0]">Type a message</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center shadow-lg">
              <Rocket size={16} className="text-black" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
      >
        <ChevronLeft size={20} />
        Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 xl:col-span-8 bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">
              Create New{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
                Campaign
              </span>
            </h1>
            <p className="text-neutral-400 mt-2">
              Upload a CSV file with your recipients.
            </p>
          </div>

          <div
            className={`flex items-center justify-center gap-2 p-3 rounded-md mb-6 text-sm font-semibold ${user?.sessionStatus === "connected"
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
              }`}
          >
            {user?.sessionStatus === "connected" ? (
              <Wifi size={16} />
            ) : (
              <WifiOff size={16} />
            )}
            <span>
              WhatsApp Status:{" "}
              <span className="font-bold capitalize">
                {user?.sessionStatus || "Unknown"}
              </span>
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                placeholder="Kolkata Midnight Offer"
                type="text"
                {...register("campaignName", {
                  required: "Campaign name is required.",
                })}
              />
              {errors.campaignName && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.campaignName.message}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="recipients-file" className="text-white">Recipients File</Label>
                <p className="text-[10px] text-neutral-500 mb-3">Upload a CSV with a 'PhoneNumber' column.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    htmlFor="recipients-file"
                    className="cursor-pointer flex items-center justify-center gap-3 border-2 border-dashed border-neutral-800 text-neutral-500 rounded-xl px-4 py-4 text-sm hover:border-cyan-500/50 hover:text-neutral-300 transition-all bg-neutral-900/30 font-medium h-14"
                  >
                    <FileUp size={18} />
                    <span className="truncate">{fileName || "Click to upload a file"}</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-3 border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 rounded-xl px-4 py-4 text-sm font-bold hover:bg-cyan-500/10 transition-all shadow-lg shadow-cyan-500/5 h-14 w-full"
                  >
                    <Braces size={18} />
                    <span>Download Template</span>
                  </button>
                </div>

                {recipientCount > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 text-green-400 text-xs bg-green-500/5 px-3 py-2 rounded-lg border border-green-500/10">
                    <CheckCircle size={14} />
                    <span className="font-bold">{recipientCount} Recipients Loaded</span>
                  </div>
                )}

                <input
                  id="recipients-file"
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="media-file">Attach Media (Optional)</Label>
              {!mediaFileName ? (
                <label
                  htmlFor="media-file"
                  className={`mt-2 w-full cursor-pointer flex items-center gap-3 border border-neutral-700 bg-neutral-900 text-neutral-400 rounded-md px-3 py-2 text-sm ${isUploadingMedia
                    ? "cursor-not-allowed opacity-50"
                    : "hover:bg-neutral-800"
                    }`}
                >
                  {isUploadingMedia ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    <Paperclip size={16} />
                  )}
                  <span>
                    {isUploadingMedia ? "Uploading..." : "Choose a file..."}
                  </span>
                </label>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-3 border border-green-700 bg-green-900/50 text-green-300 rounded-md px-3 py-2 text-sm">
                  <span className="truncate">{mediaFileName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveMediaFile}
                    className="hover:text-white"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <input
                id="media-file"
                type="file"
                className="hidden"
                onChange={handleMediaFileChange}
                ref={mediaFileInputRef}
                disabled={isUploadingMedia}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (Caption)</Label>
              <textarea
                id="message"
                rows="5"
                placeholder="Hello {{Name}}! This is a special offer for your city {{City}}..."
                className="mt-2 flex w-full border-none bg-neutral-900 text-white rounded-md px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                {...register("message", {
                  required: "Message text cannot be empty.",
                })}
              />
              {totalPlaceholders.length > 0 && (
                <div className="mt-3 p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Available Placeholders</p>
                  <div className="flex flex-wrap gap-2">
                    {totalPlaceholders.map(p => (
                      <span
                        key={p}
                        className="px-2 py-1 bg-neutral-800 text-cyan-300 text-xs rounded border border-neutral-700 cursor-pointer hover:bg-neutral-700"
                        onClick={() => {
                          const msg = document.getElementById('message');
                          const start = msg.selectionStart;
                          const end = msg.selectionEnd;
                          const text = msg.value;
                          const before = text.substring(0, start);
                          const after = text.substring(end, text.length);
                          msg.value = `${before}{{${p}}}${after}`;
                          msg.focus();
                        }}
                      >
                        {`{{${p}}}`}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2 italic">* Click a tag to insert it at your cursor.</p>
                </div>
              )}
              {errors.message && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.message.message}
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-neutral-800">
              <div className="mb-8">
                <Label>Campaign Speed (Anti-Ban)</Label>
                <p className="text-xs text-neutral-500 mt-1 mb-4">
                  Faster speeds carry a higher risk of account banning. "Safe" is recommended.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'express', label: 'Express', delay: '2-5s', color: 'border-yellow-500/50 text-yellow-500' },
                    { id: 'safe', label: 'Recommended', delay: '5-12s', color: 'border-green-500/50 text-green-500' },
                    { id: 'ultra-safe', label: 'Ultra Safe', delay: '10-25s', color: 'border-cyan-500/50 text-cyan-500' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSpeed(s.id)}
                      className={`flex flex-col items-center p-3 rounded-xl border transition-all ${speed === s.id ? `${s.color} bg-neutral-900 ring-2 ring-offset-2 ring-offset-black ring-current` : 'border-neutral-800 text-neutral-500 hover:border-neutral-700'}`}
                    >
                      <span className="text-sm font-bold">{s.label}</span>
                      <span className="text-[10px] opacity-70 mt-1">{s.delay}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <Label>Schedule Campaign</Label>
                  <p className="text-xs text-neutral-500 mt-1">
                    Send your campaign at a future time.
                  </p>
                </div>
                <ToggleSwitch enabled={isScheduled} setEnabled={setIsScheduled} />
              </div>

              <AnimatePresence>
                {isScheduled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-4">
                      <Label htmlFor="scheduledAt">Date and Time to Send</Label>
                      <div className="mt-2 relative">
                        <CalendarClock
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                          size={16}
                        />
                        <Input
                          id="scheduledAt"
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className="pl-10 appearance-none bg-neutral-800 border-neutral-700 focus:ring-cyan-500 focus:border-cyan-500 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="submit"
              disabled={isLaunchDisabled}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white rounded-md h-12 font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                "Submitting..."
              ) : isScheduled ? (
                <>
                  <CalendarClock size={20} /> Schedule Campaign
                </>
              ) : (
                <>
                  <Rocket size={20} /> Launch Now
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-time Preview Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 lg:block space-y-4">
          <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle size={18} className="text-cyan-400" />
              Message Overview
            </h3>
            <p className="text-xs text-neutral-500 mb-6">
              This is how your message will appear on your recipients' devices.
            </p>
            <WhatsAppPreview />
          </div>
        </div>
      </div>
      <SampleDownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        globalPlaceholders={globalPlaceholders}
      />
    </>
  );
};

export default CampaignsPage;
