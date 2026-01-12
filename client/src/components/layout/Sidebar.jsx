import React, { useState, useEffect, createContext, useContext } from "react";
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from "framer-motion";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import toast from "react-hot-toast";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  MessageSquare,
  Rocket,
  Box,
  Plug,
  User,
  LogOut,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";

// --- Context and Provider (No Changes) ---
const SidebarContext = createContext(undefined);
export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};
export const SidebarProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

// --- Core Reusable Sidebar UI Components ---

const SidebarToggle = () => {
  const { open, setOpen } = useSidebar();
  return (
    <button
      onClick={() => setOpen(!open)}
      className="absolute  top-5 p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hidden sm:flex items-center justify-center transition-transform hover:scale-110 z-50"
      aria-label="Toggle sidebar"
    >
      {open ? <X size={16} /> : <Menu size={16} />}
    </button>
  );
};

export const DesktopSidebar = ({ className, children }) => {
  const { open } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen p-4 hidden sm:flex sm:flex-col bg-neutral-950 border-r border-neutral-800 fixed inset-y-0 left-0 z-50 shrink-0",
        className
      )}
      animate={{ width: open ? "20%" : "60px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <SidebarToggle />
      {children}
    </motion.div>
  );
};

export const MobileSidebar = ({ className, children }) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          "flex flex-row sm:hidden items-center justify-between bg-neutral-950 border-b border-neutral-800 w-full p-4 fixed top-0 left-0 z-40"
        )}
      >
        <Logo />
        <Menu className="text-neutral-200" onClick={() => setOpen(!open)} />
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed h-full w-full inset-0 bg-neutral-950 p-10 z-[100] flex flex-col justify-between",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-neutral-200"
              onClick={() => setOpen(!open)}
            >
              <X />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarBody = (props) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  return isMobile ? (
    <MobileSidebar {...props} />
  ) : (
    <DesktopSidebar {...props} />
  );
};

export const SidebarLink = ({ link, className }) => {
  const { open } = useSidebar();
  return (
    <NavLink
      to={link.path}
      className={({ isActive }) =>
        cn(
          "flex items-center justify-start gap-4 group/sidebar py-2",
          className,
          isActive && "text-cyan-400 font-semibold"
        )
      }
    >
      {link.icon}
      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-neutral-400 group-hover/sidebar:text-cyan-400 transition-colors duration-150 whitespace-pre"
          >
            {link.label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );
};

export const Logo = () => (
  <Link to="/dashboard" className="flex items-center  gap-2 font-semibold">
    {/* FIX: Using the correct, standardized logo path */}
    <img src="/Logo2.png" alt="NextSMS Logo" className="h-8 w-auto" />
  </Link>
);

// --- Application-Specific Sidebar Content ---
const AppSidebarContent = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { open } = useSidebar();

  const handleLogout = () => {
    logout();
    toast.success("You have been logged out.");
    navigate("/login");
  };

  const navLinks = [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard /> },
    { label: "Send Message", path: "/dashboard/send", icon: <MessageSquare /> },
    { label: "Campaigns", path: "/dashboard/campaigns", icon: <Rocket /> },
    { label: "Outbox", path: "/dashboard/outbox", icon: <Box /> },
    { label: "REST API", path: "/dashboard/api", icon: <Plug /> },
    { label: "Profile", path: "/dashboard/profile", icon: <User /> },
    { label: "Help & Docs", path: "/dashboard/help", icon: <HelpCircle /> },
  ];

  return (
    // FIX: Removed 'overflow-hidden' to make the toggle button visible
    <div className="flex flex-col h-full justify-between">
      <div className="flex flex-col gap-2 mt-16 sm:mt-0">
        <div className="hidden sm:flex items-center p-4 pl-0 h-16">
          {/* --- THIS IS THE FIX for the logo --- */}
          <AnimatePresence>
            {open ? (
              // If open, show the full logo
              <motion.div
                key="full-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* <Logo /> */}
              </motion.div>
            ) : (
              // If closed, show just a small icon version
              <motion.div
                key="icon-logo"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex justify-center"
              >
                {/* <img src="/logo-icon.png" alt="NextSMS Icon" className="h-6 w-auto" /> */}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {navLinks.map((link, idx) => (
          <SidebarLink key={idx} link={link} />
        ))}
      </div>
      <div>
        <button
          onClick={handleLogout}
          className="flex items-center justify-start gap-4 group/sidebar py-2 w-full text-neutral-400 hover:text-red-500"
        >
          <LogOut />
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="transition-colors duration-150 whitespace-pre"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );
};

// --- Final Assembled Sidebar (Default Export) ---
const AppSidebar = () => (
  <SidebarBody>
    <AppSidebarContent />
  </SidebarBody>
);

export default AppSidebar;
