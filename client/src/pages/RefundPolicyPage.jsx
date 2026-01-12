import React from 'react';
import { Link } from 'react-router-dom';

const RefundPolicyPage = () => (
    <div className="pt-24 pb-20 text-neutral-300">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <div className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold text-white">Cancellation & <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Refund Policy</span></h1>
            </div>
            
            <div className="space-y-8 prose prose-invert prose-lg max-w-none">
                <p>Thank you for choosing NextSMS for your business communication needs. We want to ensure our policies regarding payments and refunds are clear and transparent.</p>
                
                <h2 className="text-2xl font-bold text-white">1. Our Free Trial</h2>
                <p>We offer a one-time free trial to all new users, which includes 50 complimentary message credits valid for 30 days. We strongly encourage you to use this trial period to thoroughly evaluate our platform and ensure it meets your needs before purchasing a subscription plan.</p>
                
                <h2 className="text-2xl font-bold text-white">2. Refund Policy</h2>
                <p>Due to the digital nature of our service and the immediate allocation of non-returnable message credits upon purchase, all payments made for subscription plans on the NextSMS platform are **final and non-refundable**. We do not offer refunds or credits for:</p>
                <ul>
                    <li>Partially used subscription periods.</li>
                    <li>Unused message credits.</li>
                    <li>Account suspensions due to a violation of our <Link to="/terms-of-service" className="text-cyan-400 hover:underline">Terms of Service</Link>.</li>
                </ul>

                <h2 className="text-2xl font-bold text-white">3. Cancellation Policy</h2>
                <p>You can choose not to renew your subscription at any time. If you cancel, your service will remain active, and you will be able to use your remaining purchased credits until the end of your current plan's validity period. No further charges will be made after that period.</p>
                
                <h2 className="text-2xl font-bold text-white">4. Incorrect Pricing</h2>
                <p>In the unlikely event that a plan is listed at an incorrect price, we reserve the right to cancel that order. If your payment has already been processed for an incorrectly priced item, we will issue a full refund for the amount paid.</p>

                <h2 className="text-2xl font-bold text-white">5. Contact Us</h2>
                <p>If you have any questions about this policy, please do not hesitate to <Link to="/contact" className="text-cyan-400 hover:underline">contact us</Link>.</p>
            </div>
        </div>
    </div>
);

export default RefundPolicyPage;

