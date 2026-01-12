import React from "react";
import { Target, Zap, ShieldCheck } from "lucide-react";

const AboutPage = () => {
  return (
    <div className="pt-24 pb-20 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            About{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
              NextSMS
            </span>
          </h1>
          <p className="text-neutral-400 max-w-3xl mx-auto mt-4 text-lg">
            We're on a mission to simplify communication for businesses in
            Kolkata and beyond.
          </p>
        </div>

        {/* Our Mission Section */}
        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Our{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
              Mission
            </span>
          </h2>
          <p className="text-neutral-300 text-lg leading-relaxed">
            In a world of constant digital noise, direct and meaningful
            communication is more important than ever. NextSMS was founded on a
            simple principle: to give businesses the power to connect with their
            customers instantly and reliably through the platform they use
            most—WhatsApp. We provide a powerful, secure, and user-friendly tool
            to help you grow your business, one message at a time.
          </p>
        </div>

        {/* Why Choose Us Section */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            Why Choose{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
              Us
            </span>
            ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center ">
            {/* Feature 1 */}
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-gray-500 transition-all duration-150 hover:border-2">
              <Target size={40} className="mx-auto text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Power & Simplicity
              </h3>
              <p className="text-neutral-400">
                From single messages to large-scale campaigns via CSV, our
                platform is designed to be powerful yet intuitive.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-gray-500 transition-all duration-150 hover:border-2">
              <Zap size={40} className="mx-auto text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Built for Developers
              </h3>
              <p className="text-neutral-400">
                Integrate with ease using our simple, straightforward REST API.
                Perfect for any application or script.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="bg-neutral-900 p-8 rounded-2xl border border-neutral-800 hover:border-gray-500 transition-all duration-150 hover:border-2">
              <ShieldCheck size={40} className="mx-auto text-cyan-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">
                Reliability & Trust
              </h3>
              <p className="text-neutral-400">
                With a robust queueing system, we ensure your messages are
                delivered reliably and safely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
