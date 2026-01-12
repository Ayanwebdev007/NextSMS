import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { LoaderCircle, Check, Plug } from "lucide-react";
// 1. Import the centralized api service
import api, { createAuthenticatedApi } from "../services/api";

// The local createApi helper has been removed.

const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(null);

  const { token, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // 2. Use the production-ready api service. The URL is now relative.
        const response = await api.get("/plans");
        setPlans(response.data);
      } catch (err) {
        console.error("Failed to fetch plans:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // --- This is the production-ready Razorpay logic ---
  const handleSubscribe = async (plan) => {
    if (!token || !user) {
      toast.error("Please log in or create an account to subscribe.");
      navigate("/login");
      return;
    }

    setIsSubscribing(plan._id);
    const toastId = toast.loading("Initializing payment...");
    const authenticatedApi = createAuthenticatedApi(token);

    try {
      const orderResponse = await authenticatedApi.post(
        "/payment/create-order",
        { planId: plan._id }
      );
      const order = orderResponse.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // This should be your LIVE public key
        amount: order.amount,
        currency: "INR",
        name: "NextSMS",
        description: `Payment for ${plan.name}`,
        image: "/Logo4.png", // Standardized logo path
        order_id: order.id,

        // --- THIS IS THE CRITICAL CHANGE for PRODUCTION ---
        // The handler is now simple. It provides immediate feedback
        // and trusts the backend webhook to handle adding the credits.
        handler: function () {
          toast.success(
            "Payment successful! Your credits will be updated shortly.",
            { id: toastId }
          );
          navigate("/dashboard");
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || "",
        },
        theme: {
          color: "#0891b2",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

      toast.dismiss(toastId);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "Could not start payment.";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubscribing(null);
    }
  };

  return (
    <div className="pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
            Choose Your{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
              Plan
            </span>
          </h1>
          <p className="text-neutral-400 max-w-2xl mx-auto mt-4 text-lg">
            Simple, transparent pricing for businesses of all sizes.
          </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <LoaderCircle size={32} className="animate-spin text-cyan-400" />
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => (
              <div
                key={plan._id}
                className={`relative flex flex-col rounded-2xl border-2 p-8 shadow-lg transition-all duration-300 ${
                  index === 1
                    ? "border-cyan-400 shadow-cyan-500/10"
                    : "border-neutral-800 hover:border-cyan-400/50"
                }`}
              >
                {index === 1 && (
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-br from-cyan-400 to-indigo-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                <p className="mt-4 text-neutral-400">
                  A great starting point for growing businesses.
                </p>
                <div className="mt-8">
                  <span className="text-5xl font-extrabold text-white">
                    ₹{(plan.price / 100).toLocaleString("en-IN")}
                  </span>
                  <span className="text-lg font-medium text-neutral-400">
                    /{plan.validityDays} days
                  </span>
                </div>
                <ul className="mt-8 space-y-4 text-neutral-300 flex-grow">
                  <li className="flex items-center gap-3">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span>
                      {plan.credits.toLocaleString("en-IN")} Message Credits
                    </span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span>Single Device Connection</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span>Bulk Messaging via CSV</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Plug className="text-green-500 h-6 w-6 flex-shrink-0" />
                    <span>REST API Access</span>
                  </li>
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={isSubscribing}
                  className={`mt-10 block w-full text-center rounded-lg px-6 py-3 text-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-wait ${
                    index === 1
                      ? "bg-gradient-to-br from-cyan-500 to-indigo-500 text-white hover:opacity-90"
                      : "bg-neutral-800 text-white hover:bg-neutral-700"
                  }`}
                >
                  {isSubscribing === plan._id ? "Processing..." : "Get Started"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PricingPage;
