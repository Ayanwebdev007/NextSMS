import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import { Send, LoaderCircle, Paperclip, X } from "lucide-react";
import { createAuthenticatedApi } from "../../services/api";

// UI Components
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
const QuickSendCard = () => {
  const { token } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  // State to manage the uploaded file
  const [uploadedFilePath, setUploadedFilePath] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append("media", file); // 'media' must match the backend field name

    try {
      const api = createAuthenticatedApi(token);
      const response = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUploadedFilePath(response.data.filePath);
      setFileName(file.name);
      toast.success("File attached successfully!", { id: toastId });
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "File upload failed.";
      toast.error(errorMessage, { id: toastId });
      setFileName("");
      setUploadedFilePath(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }
    }
  };

  const handleRemoveFile = () => {
    setFileName("");
    setUploadedFilePath(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const onSubmit = async (data) => {
    const toastId = toast.loading("Sending message...");
    const api = createAuthenticatedApi(token);
    try {
      await api.post("/message/send", {
        recipient: data.recipient,
        text: data.message,
        filePath: uploadedFilePath, // Send the path of the uploaded file
      });
      toast.success("Message sent successfully!", { id: toastId });
      reset();
      setUploadedFilePath(null);
      setFileName("");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Failed to send message.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Quick Send</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Label htmlFor="recipient">Recipient Number</Label>
        <Input
          id="recipient"
          placeholder="91xxxxxxxxxx"
          type="text"
          {...register("recipient", {
            required: "Recipient number is required.",
          })}
        />

        {errors.recipient && (
          <p className="text-red-500 text-sm -mt-2">
            {errors.recipient.message}
          </p>
        )}

        <div>
          <Label htmlFor="message">Message (Caption)</Label>
          <textarea
            id="message"
            rows="4"
            placeholder="Hello from NextSMS!"
            className="mt-2 flex w-full border-none bg-neutral-900 text-white rounded-md px-3 py-2 text-sm placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
            {...register("message", {
              required: "Message text cannot be empty.",
            })}
          />
        </div>
        {errors.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message.message}</p>
        )}

        {/* --- NEW FILE UPLOAD UI --- */}
        <div>
          <Label htmlFor="media-file">Attach Media (Optional)</Label>
          {!fileName ? (
            <label
              htmlFor="media-file"
              className={`mt-2 w-full cursor-pointer flex items-center gap-3 border border-neutral-700 bg-neutral-900 text-neutral-400 rounded-md px-3 py-2 text-sm ${
                isUploading
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-neutral-800"
              }`}
            >
              {isUploading ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Paperclip size={16} />
              )}
              <span>{isUploading ? "Uploading..." : "Choose a file..."}</span>
            </label>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-3 border border-green-700 bg-green-900/50 text-green-300 rounded-md px-3 py-2 text-sm">
              <span className="truncate">{fileName}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
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
            onChange={handleFileChange}
            ref={fileInputRef}
            disabled={isUploading}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-cyan-500 to-indigo-500 text-white rounded-md h-10 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <LoaderCircle size={18} className="animate-spin" /> Sending...
            </>
          ) : (
            <>
              <Send size={18} /> Send Message
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default QuickSendCard;
