import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
// 1. Import the centralized api service instead of axios directly
import api from "../services/api";

// UI Components
import { Label } from "../components/ui/Label";
import { Input } from "../components/ui/Input";
import GoogleLoginButton from "../components/GoogleLogin";

const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();
  const navigate = useNavigate();
  const { login, token, isLoading } = useAuth();

  useEffect(() => {
    // Only run the check after the initial authentication state has been determined.
    if (!isLoading && token) {
      navigate("/dashboard"); // If the user is already logged in, redirect them.
    }
  }, [token, isLoading, navigate]);

  const onSubmit = async (data) => {
    const toastId = toast.loading("Logging in...");
    try {
      const response = await api.post("/auth/login", {
        email: data.email,
        password: data.password,
      });

      const { token, role } = response.data;
      login(token);

      toast.success("Login successful! Welcome back.", { id: toastId });

      if (role === "admin") {
        navigate("/admin/businesses");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(errorMessage, { id: toastId });
    }
  };
  if (isLoading || token) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b]"></div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b] relative flex flex-col items-center justify-center antialiased p-4">
      <div className="max-w-md w-full mx-auto rounded-2xl p-4 md:p-8 shadow-input bg-black/80 backdrop-blur-sm border border-neutral-800">
        <div className="flex justify-center mb-4">
          <Link to="/">
            <img src="/Logo2.png" alt="Logo" className="w-48" />
          </Link>
        </div>

        <p className="text-neutral-400 text-sm max-w-sm text-center mt-2 mb-6">
          Welcome back! Please log in to access your dashboard.
        </p>

        <form className="my-8 " onSubmit={handleSubmit(onSubmit)}>
          {/* 4. Upgraded form layout to use LabelInputContainer for consistency */}

          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            placeholder="manager@example.com"
            type="email"
            {...register("email", { required: "Email is required" })}
          />

          {errors.email && (
            <p className="text-red-500 text-sm -mt-2 mb-4">
              {errors.email.message}
            </p>
          )}

          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            placeholder="••••••••"
            type="password"
            {...register("password", { required: "Password is required" })}
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
            {isSubmitting ? "Logging In..." : "Login →"}
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
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-cyan-400 hover:underline font-semibold"
          >
            Sign up
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

export default LoginPage;
