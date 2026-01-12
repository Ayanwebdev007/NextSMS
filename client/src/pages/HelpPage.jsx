import React from "react";
import {
  HelpCircle,
  QrCode,
  Clock,
  FileUp,
  Plug,
  ShieldAlert,
  ShieldOff
} from "lucide-react";

// A reusable component for each help section
const HelpSection = ({ icon, title, children }) => (
  <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
    <div className="flex items-center gap-3 mb-4">
      {icon}
      <h2 className="text-xl font-bold text-white">{title}</h2>
    </div>
    <div className="text-neutral-400 space-y-3 leading-relaxed">{children}</div>
  </div>
);

const HelpPage = () => {
  const csvTemplateContent = "PhoneNumber,Name\n919733140877,Sample User";
  const csvTemplateBlob = new Blob([csvTemplateContent], {
    type: "text/csv;charset=utf-8;",
  });
  const csvTemplateUrl = URL.createObjectURL(csvTemplateBlob);

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 mt-16">
        We Got{" "}
        <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">
          You
        </span>
      </h1>
      <div className="space-y-8">
        <HelpSection
          icon={<QrCode size={24} className="text-cyan-400" />}
          title="Connecting Your WhatsApp"
        >
          <p>
            To connect your WhatsApp account, navigate to the main{" "}
            <span className="font-semibold text-white">Dashboard</span>. Click
            the green "Connect" button. This will generate a unique QR code in a
            pop-up window.
          </p>
          <p>
            You must scan this code with your phone using the WhatsApp app (
            <span className="font-semibold text-white">
              Settings &gt; Linked Devices &gt; Link a Device
            </span>
            ).
          </p>
        </HelpSection>

        <HelpSection
          icon={<Clock size={24} className="text-cyan-400" />}
          title="Connection Time"
        >
          <p>
            After you click "Connect," the server starts a background process to
            generate the QR code. This can sometimes take a moment. Please be
            patient; the QR code should appear in the pop-up within{" "}
            <span className="font-semibold text-white">20 to 40 seconds</span>.
          </p>
          <p>
            Once you scan the code, your status on the dashboard will
            automatically update to{" "}
            <span className="text-green-500">"Connected"</span> within a few
            seconds.
          </p>
        </HelpSection>

        <HelpSection
          icon={<FileUp size={24} className="text-cyan-400" />}
          title="Sending Bulk SMS via CSV"
        >
          <p>
            Our most powerful feature is sending bulk messages by uploading a
            CSV file. To do this, go to the{" "}
            <span className="font-semibold text-white">Campaigns</span> page.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              Your CSV file{" "}
              <span className="font-semibold text-white">must</span> contain a
              header row.
            </li>
            <li>
              The phone numbers must be in a column with the exact header:{" "}
              <code className="bg-neutral-800 p-1 rounded-md text-white">
                PhoneNumber
              </code>
              .
            </li>
            <li>
              The first phone number in the list must be
              <code className="bg-neutral-800 p-1 rounded-md text-white">
                919733140877
              </code>
              for security reasons and to gain feedback from you to us .
            </li>
            <li>
              Numbers can be with or without the country code, as long as they
              are valid.
            </li>
          </ul>
          <a
            href={csvTemplateUrl}
            download="sample-recipients.csv"
            className="inline-block mt-4 text-cyan-400 hover:text-white font-semibold underline"
          >
            Download Sample CSV Template
          </a>
        </HelpSection>

        <HelpSection
          icon={<Plug size={24} className="text-cyan-400" />}
          title="Using the REST API"
        >
          <p>
            You can integrate our service into your own applications using our
            simple REST API. To get started, navigate to the{" "}
            <span className="font-semibold text-white">REST API</span> page in
            your dashboard.
          </p>
          <p>
            First, generate your permanent API Key. This key does not expire and
            should be kept secure. You can then use this key to send messages
            via a simple GET request, as shown in the code examples on that
            page.
          </p>
        </HelpSection>

        <HelpSection
          icon={<ShieldAlert size={24} className="text-cyan-400" />}
          title="When the API Will Not Work"
        >
          <p>
            Your API key will not work under certain conditions, which is a
            security feature to protect your account.
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              <span className="font-semibold text-white">
                Disconnected Session:
              </span>{" "}
              Before sending any message via the API, you must have an active,
              "Connected" WhatsApp session in your dashboard.
            </li>
            <li>
              <span className="font-semibold text-white">
                Insufficient Credits:
              </span>{" "}
              API access is a premium feature. You must have more than 100
              credits in your account to generate an API key and send messages.
            </li>
          </ul>
        </HelpSection>
        <HelpSection
          icon={<ShieldOff size={24} className="text-red-500" />}
          title="Account Suspension"
        >
          <p>
            To maintain the integrity of our platform and comply with messaging
            policies, accounts found to be engaging in mischievous activities,
            such as sending spam or prohibited content, will be suspended by our
            admin team.
          </p>
          <p className="font-semibold text-white">
            How to Reactivate Your Account:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-2">
            <li>
              To appeal a suspension, you must contact our support team by
              sending an email to{" "}
              <a
                href="mailto:nextsms.co@gmail.com"
                className="font-semibold text-cyan-400 hover:underline"
              >
                nextsms.co@gmail.com
              </a>{" "}
              or by calling us at{" "}
              <span className="font-semibold text-cyan-400">
                (+91) 9733 140 877
              </span>
              .
            </li>
            <li>
              Our team will review your case. If your account is eligible for
              reactivation, a one-time reactivation fee will be charged.
            </li>
            <li>
              Your account's messaging capabilities will only be restored after
              the verification is complete and the fee has been paid.
            </li>
          </ul>
        </HelpSection>
      </div>
    </>
  );
};

export default HelpPage;
