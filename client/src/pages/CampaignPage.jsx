import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Papa from "papaparse";
import { createAuthenticatedApi } from "../services/api";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";

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
  CalendarClock,
  WifiOff,
} from "lucide-react";

const ToggleSwitch = ({ enabled, setEnabled }) => (
  <div
    onClick={() => setEnabled(!enabled)}
    className={`flex items-center w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-300 ${
      enabled ? "bg-cyan-500 justify-end" : "bg-neutral-700 justify-start"
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
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();

  const [recipientCount, setRecipientCount] = useState(0);
  const [fileName, setFileName] = useState("");
  const [recipients, setRecipients] = useState([]);
  const fileInputRef = useRef(null);

  const [uploadedMediaPath, setUploadedMediaPath] = useState(null);
  const [mediaFileName, setMediaFileName] = useState("");
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const mediaFileInputRef = useRef(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setFileName(file.name);
    const toastId = toast.loading("Processing file...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const numbers = result.data
          .map((row) => row.PhoneNumber)
          .map((num) => (num ? num.toString().replace(/\D/g, "") : ""))
          .filter((num) => num && num.length >= 10);
        if (numbers.length === 0) {
          toast.error(
            "No valid phone numbers found in the 'PhoneNumber' column.",
            { id: toastId }
          );
          setFileName("");
          setRecipientCount(0);
          setRecipients([]);
        } else {
          setRecipients(numbers);
          setRecipientCount(numbers.length);
          toast.success(
            `${numbers.length} recipients successfully extracted.`,
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
      const response = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
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
      // --- THIS IS THE CRITICAL FIX for TIMEZONES ---
      // 1. Calculate the exact delay in milliseconds from the user's local time.
      let delay = 0;
      if (isScheduled) {
        delay = new Date(scheduledAt).getTime() - Date.now();
      }
      // --- END OF FIX ---

      // 2. Send both the scheduledAt date (for storage) and the calculated delay.
      await api.post("/campaign/start", {
        name: data.campaignName,
        recipients: recipients,
        message: data.message,
        filePath: uploadedMediaPath,
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : null,
        delay: delay > 0 ? delay : 0, // Send the calculated delay
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

  return (
    <>
      <button
        onClick={() => navigate("/dashboard")}
        className="flex items-center gap-2 text-neutral-400 hover:text-white mb-8 transition-colors"
      >
        <ChevronLeft size={20} />
        Back to Dashboard
      </button>

      <div className="max-w-2xl mx-auto bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg">
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
          className={`flex items-center justify-center gap-2 p-3 rounded-md mb-6 text-sm font-semibold ${
            user?.sessionStatus === "connected"
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
            <p className="text-red-500 text-sm -mt-4">
              {errors.campaignName.message}
            </p>
          )}

          <div>
            <Label htmlFor="recipients-file">Recipients File</Label>
            <p className="text-xs text-neutral-500 mb-2">
              Upload a CSV with a 'PhoneNumber' column.
            </p>
            <label
              htmlFor="recipients-file"
              className="w-full cursor-pointer mt-1 flex items-center justify-center gap-3 border-2 border-dashed border-neutral-700 text-neutral-400 rounded-md px-3 py-4 text-sm hover:border-cyan-400 hover:text-cyan-400 transition-colors"
            >
              <FileUp size={20} />
              <span>{fileName || "Click to upload a file"}</span>
            </label>
            <input
              id="recipients-file"
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileChange}
              ref={fileInputRef}
            />
            {recipientCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle size={16} />
                <span>{recipientCount} contacts loaded successfully.</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="media-file">Attach Media (Optional)</Label>
            {!mediaFileName ? (
              <label
                htmlFor="media-file"
                className={`mt-2 w-full cursor-pointer flex items-center gap-3 border border-neutral-700 bg-neutral-900 text-neutral-400 rounded-md px-3 py-2 text-sm ${
                  isUploadingMedia
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

          <div>
            <Label htmlFor="message">Message (Caption)</Label>
            <textarea
              id="message"
              rows="5"
              placeholder="Hello! This is a special offer from NextSMS..."
              className="mt-2 flex w-full border-none bg-neutral-900 text-white rounded-md px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
              {...register("message", {
                required: "Message text cannot be empty.",
              })}
            />
          </div>
          {errors.message && (
            <p className="text-red-500 text-sm mt-1">
              {errors.message.message}
            </p>
          )}

          <div className="pt-6 border-t border-neutral-800">
            <div className="flex items-center justify-between">
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
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: "1rem" }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  
                    <Label htmlFor="scheduledAt">Date and Time to Send</Label>
                    <div className="relative">
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
    </>
  );
};

export default CampaignsPage;
