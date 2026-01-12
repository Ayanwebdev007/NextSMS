import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { LoaderCircle } from "lucide-react";

const ProtectedRoute = () => {
  const auth = useAuth();

  if (!auth || auth.isLoading) {
    return (
      <div className="min-h-screen w-full bg-black flex items-center justify-center">
        <LoaderCircle className="animate-spin text-white h-12 w-12" />
      </div>
    );
  }

  if (!auth.token) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
