import React,{useEffect} from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
// 1. Import the centralized api service instead of axios directly
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";

// UI Components
import { Label } from "../components/ui/Label";
import { Input } from "../components/ui/Input";
import GoogleLoginButton from "../components/GoogleLogin";

const RegisterPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();
    const { token, isLoading } = useAuth(); // 3. Get token and loading state

  // --- THIS IS THE "BOUNCER" LOGIC ---
  useEffect(() => {
    if (!isLoading && token) {
      navigate("/dashboard"); // If the user is already logged in, redirect them.
    }
  }, [token, isLoading, navigate]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Creating your account...");
    try {
      // 2. The API call now uses the centralized service.
      // The URL is now relative ('/auth/register') because the base is configured in api.js
      await api.post("/auth/register", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });

      toast.success("Registration successful! Please log in.", { id: toastId });
      navigate("/login");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Registration failed. Please try again.";
      toast.error(errorMessage, { id: toastId });
    }
  };

  if (isLoading || token) {
    return <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b]"></div>;
  }
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b] relative flex flex-col items-center justify-center antialiased p-4">
      <div className="max-w-md w-full mx-auto rounded-2xl p-4 md:p-8 shadow-input bg-black/80 backdrop-blur-sm border border-neutral-800">
        <div className="flex justify-center mb-4">
          {/* 3. Corrected logo path for Vite. Assumes logo is named 'logo.png' in the /public folder */}
          <img src="/Logo2.png" alt="Logo" className="w-48" />
        </div>

        <p className="text-neutral-400 text-sm max-w-sm text-center mt-2 mb-6">
          Create your account to start your next messaging campaign.
        </p>

        <form className="my-8" onSubmit={handleSubmit(onSubmit)}>
          {/* 4. Upgraded form layout to use LabelInputContainer for consistency */}

          <Label htmlFor="name">Business Name</Label>
          <Input
            id="name"
            placeholder="Kolkata Digital Marketing"
            type="text"
            {...register("name", { required: "Business name is required" })}
          />

          {errors.name && (
            <p className="text-red-500 text-sm -mt-2 mb-4">
              {errors.name.message}
            </p>
          )}

          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            placeholder="manager@example.com"
            type="email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^\S+@\S+$/i,
                message: "Invalid email address",
              },
            })}
          />

          {errors.email && (
            <p className="text-red-500 text-sm -mt-2 mb-4">
              {errors.email.message}
            </p>
          )}

          <Label htmlFor="phone">Mobile Number (Optional)</Label>
          <Input
            id="phone"
            placeholder="9876543210"
            type="tel"
            {...register("phone", {
              minLength: { value: 10, message: "Must be 10 digits" },
              maxLength: { value: 10, message: "Must be 10 digits" },
            })}
          />

          {errors.phone && (
            <p className="text-red-500 text-sm -mt-2 mb-4">
              {errors.phone.message}
            </p>
          )}

          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />

          {errors.password && (
            <p className="text-red-500 text-sm -mt-2 mb-4">
              {errors.password.message}
            </p>
          )}

          <button
            className="mt-4 bg-gradient-to-br relative group/btn from-cyan-500 to-indigo-500 block w-full text-white rounded-md h-10 font-medium shadow-[0px_1px_0px_0px_var(--zinc-800)_inset,0px_-1px_0px_0px_var(--zinc-800)_inset]"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing Up..." : "Sign up →"}
            <BottomGradient />
          </button>
        </form>

        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-neutral-700"></div>
          <span className="flex-shrink mx-4 text-neutral-500 text-sm">OR</span>
          <div className="flex-grow border-t border-neutral-700"></div>
        </div>

        <GoogleLoginButton />

        <p className="text-center text-sm text-neutral-500 mt-8">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-cyan-400 hover:underline font-semibold"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

const BottomGradient = () => {
  return (
    <>
      <span className="group-hover/btn:opacity-100 block transition duration-500 opacity-0 absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      <span className="group-hover/btn:opacity-100 blur-sm block transition duration-500 opacity-0 absolute h-px w-1/2 mx-auto -bottom-px inset-x-10 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
    </>
  );
};

export default RegisterPage;
