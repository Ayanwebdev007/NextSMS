import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lightbulb, MessageSquareText, Rocket } from 'lucide-react';

const BestPractices = () => {
    const practices = [
        {
            icon: <ShieldCheck size={20} className="text-cyan-400" />,
            text: "Respect WhatsApp's policies to avoid account blocking. Do not send spam.",
        },
        {
            icon: <Lightbulb size={20} className="text-cyan-400" />,
            text: "Personalize your messages to increase engagement and build customer trust.",
        },
        {
            icon: <MessageSquareText size={20} className="text-cyan-400" />,
            text: "Each successful message sent will deduct one credit from your account balance.",
        }
    ];

    return (
        <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg h-full">
            <h2 className="text-xl font-bold text-white mb-4">Best Practices</h2>
            <ul className="space-y-4 text-neutral-400 text-sm mb-6">
                {practices.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">{item.icon}</div>
                        <span>{item.text}</span>
                    </li>
                ))}
            </ul>

            <Link 
                to="/dashboard/campaigns"
                className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
                <Rocket size={18} />
                Need to send in <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">bulk?</span>
            </Link>
        </div>
    );
};

export default BestPractices;
