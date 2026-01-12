import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Instagram, Linkedin, ChevronDown, Facebook } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const [openCategory, setOpenCategory] = useState(null);

  const socialLinks = [
    { icon: <Facebook size={20} />, href: "https://m.facebook.com/61582347924507/", name: "Twitter" },
    { icon: <Instagram size={20} />, href: "https://www.instagram.com/nextsms.co/", name: "Instagram" },
    { icon: <Linkedin size={20} />, href: "https://www.linkedin.com", name: "LinkedIn" },
  ];

  const footerLinks = {
    Product: [
      { name: "Pricing", href: "/pricing" },
      { name: "Home", href: "/" },
    ],
    Company: [
      { name: "About Us", href: "/about" },
      { name: "Contact Us", href: "/contact" },
    ],
    Legal: [
      { name: "Privacy Policy", href: "/privacy-policy" },
      { name: "Terms of Service", href: "/terms" },
      { name: "Refund Policy", href: "/refund-policy" },
    ],
  };

  const toggleCategory = (category) => {
    setOpenCategory(openCategory === category ? null : category);
  };

  return (
    <footer className="bg-neutral-950 border-t border-neutral-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          {/* Column 1: Logo + socials (Already responsive) */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-4">
            <Link to="/" className="block">
              <img
                src="/Logo2.png"
                alt="NextSMS Logo"
                className="h-14 w-auto"
              />
            </Link>
            <p className="text-neutral-400 text-sm max-w-xs">
              Simplifying business communication in Kolkata and beyond.
            </p>
            <div className="flex justify-center md:justify-start space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="text-neutral-500 hover:text-white transition-colors"
                >
                  <span className="sr-only">{social.name}</span>
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Column 2-4: Footer links */}
          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {Object.keys(footerLinks).map((category) => (
              // --- THIS IS THE FIX ---
              // The text-center and md:text-left classes are now applied here
              // to correctly align both the header and the links on all screen sizes.
              <div key={category} className="text-center md:text-left">
                {/* Mobile Accordion Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between md:justify-start text-sm font-semibold text-white tracking-wider uppercase md:cursor-default"
                >
                  {category}
                  <ChevronDown
                    size={18}
                    className={`ml-2 md:hidden transform transition-transform ${
                      openCategory === category ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Links */}
                <ul
                  className={`mt-3 space-y-2 overflow-hidden transition-all duration-300 md:mt-4 md:block ${
                    openCategory === category
                      ? "max-h-40" // Animate open
                      : "max-h-0 md:max-h-none" // Animate closed on mobile, always show on desktop
                  }`}
                >
                  {footerLinks[category].map((link) => (
                    <li key={link.name}>
                      <Link
                        to={link.href}
                        className="block text-base text-neutral-400 hover:text-white transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-neutral-800 pt-8 text-center">
          <p className="text-sm text-neutral-500">
            &copy; {currentYear} NextSMS. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

