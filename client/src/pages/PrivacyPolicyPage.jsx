import React from "react";

const PrivacyPolicyPage = () => (
  <div className="pt-24 pb-20 text-neutral-300">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white">
          Privacy Policy for{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
            NextSMS
          </span>
        </h1>
      </div>

      <div className="space-y-8 prose prose-invert prose-lg max-w-none">
        <p>
          Welcome to NextSMS ("us", "we", or "our"). We are committed to
          protecting your personal information. This Privacy Policy explains how
          we collect, use, and safeguard your data when you use our services
          through the nextsms.co.in website (the "Site").
        </p>

        <h2 className="text-2xl font-bold text-white">
          1. Information We Collect
        </h2>
        <p>
          We collect information that is necessary to provide and improve our
          service:
        </p>
        <ul>
          <li>
            <strong>Account Information:</strong> When you register, we collect
            your name, email address, and optionally, your phone number.
          </li>
          <li>
            <strong>Communication Data:</strong> We process the recipient phone
            numbers, message content, and media files/URLs you provide when
            sending single messages or launching campaigns.
          </li>
          <li>
            <strong>Payment Information:</strong> We do not store your credit
            card or full payment details. All transactions are processed
            securely through our payment partner, Razorpay. We only store a
            record of the transaction for billing purposes.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-white">
          2. How We Use Your Information
        </h2>
        <p>Your information is used for the following purposes:</p>
        <ul>
          <li>To provide, operate, and maintain our services.</li>
          <li>
            To process your transactions and manage your subscription plans.
          </li>
          <li>
            To communicate with you, including for customer support and sending
            you updates or promotional messages, which you can opt out of.
          </li>
          <li>
            To enforce our Terms of Service and prevent fraudulent or illegal
            activities.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-white">
          3. Data Sharing and Disclosure
        </h2>
        <p>
          We do not sell your personal information. We may share your data in
          the following limited circumstances:
        </p>
        <ul>
          <li>
            <strong>With Service Providers:</strong> Such as Razorpay for
            payment processing.
          </li>
          <li>
            <strong>For Legal Compliance:</strong> We may disclose your
            information if required by law or in response to valid requests by
            public authorities (e.g., a court or a government agency),
            particularly in cases involving the misuse of our platform for
            deceptive or illegal activities.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-white">4. Data Security</h2>
        <p>
          We use industry-standard security measures to protect your data.
          However, no method of transmission over the Internet is 100% secure,
          and while we strive to protect your personal information, we cannot
          guarantee its absolute security.
        </p>

        <h2 className="text-2xl font-bold text-white">5. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us
          via our{" "}
          <a href="/contact" className="text-cyan-400 hover:underline">
            Contact Page
          </a>
          .
        </p>
      </div>
    </div>
  </div>
);

export default PrivacyPolicyPage;
