import React from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Mail, MapPin, Phone } from "lucide-react";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
// 1. Import the centralized api service
import api from "../services/api";

const ContactPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm();

  // --- THIS IS THE FIX ---
  // The onSubmit function now makes a real API call to your backend.
  const onSubmit = async (data) => {
    const toastId = toast.loading("Sending your message...");
    try {
      // Use the api service to send the form data to the /api/contact endpoint
      await api.post("/contact", data);
      toast.success("Message sent! We'll get back to you soon.", {
        id: toastId,
      });
      reset(); // Clear the form after successful submission
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send message. Please try again.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  return (
    <div className="pt-24 pb-20 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Get In <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Touch</span>
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto mt-4 text-lg">
            Have a question or want to work with us? Drop us a line.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Left Side: Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Contact Information
              </h2>
              <p className="text-neutral-400">
                Fill up the form and our team will get back to you within 24
                hours.
              </p>
            </div>
            <div className="space-y-6 text-neutral-300">
              <div className="flex items-center gap-4">
                <Phone size={20} className="text-cyan-400" />
                <span>(+91) 9733 140 877</span>
              </div>
              <div className="flex items-center gap-4">
                <Mail size={20} className="text-cyan-400" />
                <span> nextsms.co@gmail.com</span>
              </div>
              <div className="flex items-center gap-4">
                <MapPin size={20} className="text-cyan-400" />
                <span>
                  Kolkata, 700074, West Bengal, India
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Contact Form (Now uses LabelInputContainer) */}
          <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Afnan"
                type="text"
                {...register("name", { required: "Name is required." })}
              />

              {errors.name && (
                <p className="text-red-500 text-sm -mt-4">
                  {errors.name.message}
                </p>
              )}

              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                placeholder="afnan@example.com"
                type="email"
                {...register("email", { required: "Email is required." })}
              />

              {errors.email && (
                <p className="text-red-500 text-sm -mt-4">
                  {errors.email.message}
                </p>
              )}

              <div>
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  rows="5"
                  placeholder="How can we help you?"
                  className="mt-2 flex w-full border-none bg-neutral-800 text-white rounded-md px-3 py-2 text-sm placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-900"
                  {...register("message", {
                    required: "Message cannot be empty.",
                  })}
                />
              </div>
              {errors.message && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.message.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-br from-cyan-500 to-indigo-500 text-white rounded-md h-12 font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
