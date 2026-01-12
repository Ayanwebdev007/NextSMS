import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import { LogOut, Gem, UserCircle } from "lucide-react";
const Navbar = () => {
  const { user, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  return (
    <header className="fixed top-0 left-0 w-full bg-black/50 backdrop-blur-sm border-b border-neutral-800 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo on the left */}
          <div className="flex-shrink-0 mt-1.5">
            <Link to="/">
              <img src="/Logo2.png" alt="Logo" className="px-8 h-14 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* 2. Display user info only when not loading and the user object exists */}
            {!isLoading && user ? (
              <div className="flex items-center gap-3">
                
                <div className="text-right">
                  <p className="text-lg font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-md  text-cyan-400">
                    <Link to="/pricing">
                    <Gem size={18} />
                    </Link>

                    <span>{user.plan ? user.plan.name : "Trial Plan"}</span>
                  </div>
                </div>
                <Link to="/dashboard/profile">
                <UserCircle size={32} className="text-neutral-400" />
                </Link>
              </div>
            ) : (
              <div className="h-8 w-32 bg-neutral-800 rounded animate-pulse"></div>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-neutral-400 hover:text-red-500 transition-colors duration-200"
              title="Logout"
            >
              <LogOut size={20} className=" hover:text-red-500" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
