import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar, { useSidebar, SidebarProvider } from "./Sidebar";
import Header from "./Header";
import SuspendedBanner from "../SuspendedBanner";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 640);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isDesktop;
};

const DashboardContent = () => {
  const { open } = useSidebar();
  const isDesktop = useIsDesktop();

  return (
    <motion.div
      className="flex-1"
      animate={{
        // Only apply the animated padding on desktop screens
        paddingLeft: isDesktop ? (open ? "300px" : "60px") : 0,
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="flex flex-col h-screen">
        {/* The Header is correctly hidden on mobile by its own classes */}
        <div className="hidden sm:block">
          <Header />
        </div>

        <SuspendedBanner />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-8 pt-20 sm:pt-8">
            <Outlet />
          </div>
        </main>
      </div>
    </motion.div>
  );
};

const DashboardLayout = () => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b] text-white">
      <SidebarProvider>
        <div className="relative sm:flex">
          <AppSidebar />
          <DashboardContent />
        </div>
      </SidebarProvider>
    </div>
  );
};

export default DashboardLayout;
