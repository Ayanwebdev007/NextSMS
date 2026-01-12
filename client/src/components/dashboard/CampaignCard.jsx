import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket } from 'lucide-react';

const StartCampaignCard = () => {
    return (
        <Link to="/dashboard/campaigns" className="block group">
            <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg h-full flex flex-col items-center justify-center text-center hover:border-cyan-400 transition-all duration-300 transform hover:-translate-y-1">
                <Rocket size={40} className="text-cyan-400 mb-4 group-hover:animate-pulse" />
                <h2 className="text-xl font-bold text-white mb-2">
                    Start a New <span className='bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500'>Campaign</span>
                </h2>
                <p className="text-neutral-400 text-sm">
                    Send a message to multiple recipients at once.
                </p>
            </div>
        </Link>
    );
};

export default StartCampaignCard;
