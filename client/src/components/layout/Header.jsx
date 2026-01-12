import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useSidebar } from "./Sidebar";
import toast from "react-hot-toast";
import { LogOut, Gem, UserCircle, Menu } from "lucide-react";
import { cn } from "../../lib/utils";

const Header = () => {
  const { user, isLoading, logout } = useAuth();
  // Get the 'setOpen' function to control the mobile menu
  const { setOpen } = useSidebar();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  return (
    // The header is now fixed and spans the full width
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 flex items-center h-16 shrink-0 bg-black/50 backdrop-blur-lg border-b border-neutral-800 px-4 sm:px-8"
      )}
    >
      <div className="flex items-center justify-between w-full">
        {/* Logo on the left */}
        <Link to="/" className="flex items-center gap-2 mx-4 font-semibold">
          <img src="/Logo2.png" alt="NextSMS Logo" className="h-12 w-auto" />
        </Link>

        {/* Right side content */}
        <div className="flex items-center gap-4">
          {/* User Info - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-3">
            {!isLoading && user ? (
              <>
                <div className="text-right">
                  <p className="text-md font-semibold text-white truncate">
                    {user.name}
                  </p>
                  <div className="flex items-center justify-end gap-1.5 text-sm text-cyan-400">
                    <Link to="/pricing">
                      <Gem size={16} />
                    </Link>
                    <span>{user.plan ? user.plan.name : "Trial Plan"}</span>
                  </div>
                </div>
                <Link to="dashboard/profile">
                  <UserCircle size={32} className="text-neutral-400" />
                </Link>
              </>
            ) : (
              <div className="h-8 w-32 bg-neutral-800 rounded animate-pulse"></div>
            )}
            <div className="h-8 w-px bg-neutral-700"></div>
          </div>

          {/* Logout Button - Hidden on mobile */}
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-2 text-neutral-400 hover:text-white transition-colors duration-200"
            title="Logout"
          >
            <LogOut size={20} />
          </button>

          {/* Hamburger Menu Icon - Only visible on mobile */}
          <button
            className="sm:hidden text-neutral-300"
            onClick={() => setOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
