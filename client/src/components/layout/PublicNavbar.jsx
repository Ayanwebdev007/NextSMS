import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";
import { Menu, X } from "lucide-react"; // 1. Import menu icons

const PublicNavbar = () => {
  const [hoveredLink, setHoveredLink] = useState(null);
  const { token } = useAuth();
  // 2. State to manage the mobile menu's open/closed state
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { name: "Pricing", href: "/pricing" },
    { name: "About Us", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full bg-black/30 backdrop-blur-lg border-b border-neutral-800 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                src="/Logo2.png"
                alt="NextSMS Logo"
                className="h-14 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div
            className="hidden md:flex md:items-center md:space-x-8"
            onMouseLeave={() => setHoveredLink(null)}
          >
            {navLinks.map((link) => (
              <div
                key={link.name}
                className="relative"
                onMouseEnter={() => setHoveredLink(link.name)}
              >
                <NavLink
                  to={link.href}
                  className={({ isActive }) =>
                    `relative z-10 transition-colors duration-300 ${
                      isActive
                        ? "text-white"
                        : "text-neutral-300 hover:text-white"
                    }`
                  }
                >
                  {link.name}
                </NavLink>
                <AnimatePresence>
                  {hoveredLink === link.name && (
                    <motion.div
                      className="absolute inset-x-0 -bottom-1.5 h-0.5 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full"
                      layoutId="navbar-underline"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { duration: 0.15 } }}
                      exit={{
                        opacity: 0,
                        transition: { duration: 0.15, delay: 0.2 },
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <h1 className=" mt-3 text-4xl text-blue-400 flex items-center">
              <span
                className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-400 text-black"
                aria-label="Beta version"
                title="Beta version"
              >
                BETA
              </span>
            </h1>
            {token ? (
              <Link
                to="/dashboard"
                className="bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-neutral-300 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* --- 3. THIS IS THE NEW MOBILE MENU BUTTON --- */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-neutral-300 hover:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- 4. THIS IS THE NEW MOBILE DROPDOWN MENU --- */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute top-16 left-0 w-full bg-neutral-950 border-b border-neutral-800"
          >
            <div className="flex flex-col items-center space-y-4 p-6">
              {navLinks.map((link) => (
                <NavLink
                  key={link.name}
                  to={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="text-neutral-300 hover:text-white text-lg"
                >
                  {link.name}
                </NavLink>
              ))}
              <div className="w-full pt-4 mt-4 border-t border-neutral-800 flex flex-col items-center space-y-4">
                {token ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-center bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className="text-neutral-300 hover:text-white text-lg"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setIsMenuOpen(false)}
                      className="w-full text-center bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-4 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default PublicNavbar;
