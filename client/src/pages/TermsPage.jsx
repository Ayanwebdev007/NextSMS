import React from 'react';

const TermsPage = () => (
    <div className="pt-24 pb-20 text-neutral-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white">Terms of <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Service</span></h1>
                
            </div>
            
            <div className="space-y-8 prose prose-invert prose-lg max-w-none">
                <p>Please read these Terms of Service ("Terms") carefully before using the NextSMS platform ("Service"). Your access to and use of the Service is conditioned upon your acceptance of and compliance with these Terms.</p>
                
                <h2 className="text-2xl font-bold text-white">1. Lawful Conduct & Prohibited Use</h2>
                <p>You agree to use our platform strictly for legitimate purposes and in accordance with all applicable laws and regulations. The use of our services for deceptive, fraudulent, or illegal activities is strictly prohibited. This includes, but is not limited to, sending bogus prize notifications, counterfeit inheritance announcements, or fraudulent opportunities. We reserve the right to cooperate with law enforcement and provide user details in response to such violations.</p>
                
                <h2 className="text-2xl font-bold text-white">2. Account Suspension & Termination</h2>
                <p>We reserve the right, at our sole discretion, to suspend or terminate your account without prior notice if we determine that a violation of these Terms has occurred. This includes misuse of the platform for spamming, sending unsolicited messages, or other prohibited activities. Following such termination, data stored in your account may become irretrievable.</p>

                <h2 className="text-2xl font-bold text-white">3. Payments, Credits & Refunds</h2>
                <p>All payments for subscription plans are processed through our secure payment partner, Razorpay. By initiating a purchase, you agree to complete the transaction. All purchases of message credits are final and non-refundable, as detailed in our <a href="/refund-policy" className="text-cyan-400 hover:underline">Refund Policy</a>.</p>

                <h2 className="text-2xl font-bold text-white">4. User Responsibilities</h2>
                <p>You are solely responsible for the accuracy of the information you provide and for the content of the messages you send. You are also responsible for complying with any "Do Not Disturb" (DND) registries applicable in your region.</p>

                <h2 className="text-2xl font-bold text-white">5. Disclaimer of Liability</h2>
                <p>We cannot be held liable for service interruptions, delays, or downtime arising from circumstances beyond our immediate control (Force Majeure). We also disclaim accountability for any misinformation or inaccuracies from third-party services you may interact with.</p>
            </div>
        </div>
    </div>
);

export default TermsPage;

