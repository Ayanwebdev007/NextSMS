import React, { useState, useEffect } from 'react';
// 1. Import the new authenticated API helper instead of axios directly
import { createAuthenticatedApi } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { 
    User, Mail, MessageSquareText, LoaderCircle, CalendarDays, 
    Shield, Activity, CalendarX, Gem, Phone 
} from 'lucide-react';

// 2. The local createApi helper function has been removed.

const ProfilePage = () => {
    const { token } = useAuth();
    const [businessInfo, setBusinessInfo] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchBusinessInfo = async () => {
            if (!token) return;
            // 3. Use the centralized helper to create the API instance
            const api = createAuthenticatedApi(token); 
            try {
                // The URL is now simply '/auth/me' because the base is configured in the service
                const response = await api.get('/auth/me');
                setBusinessInfo(response.data);
            } catch (error) {
                console.error("Failed to fetch business info:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBusinessInfo();
    }, [token]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><LoaderCircle size={32} className="animate-spin text-cyan-400" /></div>;
    }

    if (!businessInfo) {
        return <p className="text-red-500">Could not load profile details.</p>;
    }

    return (
        <>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-8 mt-16">
                Your <span className="bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-indigo-500">Profile</span>
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Column: User & Account Details */}
                <div className="lg:col-span-2 bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg space-y-6">
                    {/* --- User Details --- */}
                    <div className="flex items-center gap-4">
                        <User size={24} className="text-cyan-400" />
                        <div>
                            <p className="text-sm text-neutral-400">Business Name</p>
                            <p className="text-lg text-white font-semibold">{businessInfo.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Mail size={24} className="text-cyan-400" />
                        <div>
                            <p className="text-sm text-neutral-400">Email Address</p>
                            <p className="text-lg text-white font-semibold">{businessInfo.email}</p>
                        </div>
                    </div>
                    {businessInfo.phone && (
                        <div className="flex items-center gap-4">
                            <Phone size={24} className="text-cyan-400" />
                            <div>
                                <p className="text-sm text-neutral-400">Mobile Number</p>
                                <p className="text-lg text-white font-semibold">{businessInfo.phone}</p>
                            </div>
                        </div>
                    )}
                    <div className="pt-6 border-t border-neutral-800 space-y-6">
                        {/* --- Account Status --- */}
                        <div className="flex items-center gap-4">
                            <Shield size={24} className="text-cyan-400" />
                            <div>
                                <p className="text-sm text-neutral-400">Account Role</p>
                                <p className="text-lg text-white font-semibold capitalize">{businessInfo.role}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Activity size={24} className="text-cyan-400" />
                             <div>
                                <p className="text-sm text-neutral-400">Account Status</p>
                                <p className="text-lg text-white font-semibold">
                                     <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${
                                        businessInfo.status === 'active' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                    }`}>
                                        {businessInfo.status}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <CalendarDays size={24} className="text-cyan-400" />
                            <div>
                                <p className="text-sm text-neutral-400">Account Created</p>
                                <p className="text-lg text-white font-semibold">{new Date(businessInfo.createdAt).toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Plan & Credits Details */}
                <div className="lg:col-span-1 bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 shadow-lg space-y-6">
                     <div className="flex items-center gap-4">
                        <Gem size={24} className="text-cyan-400" />
                        <div>
                            <p className="text-sm text-neutral-400">Current Plan</p>
                            <p className="text-lg text-white font-semibold">{businessInfo.plan ? businessInfo.plan.name : 'Trial'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <CalendarX size={24} className="text-cyan-400" />
                        <div>
                            <p className="text-sm text-neutral-400">Plan Expiry Date</p>
                            <p className="text-lg text-white font-semibold">{businessInfo.planExpiry ? new Date(businessInfo.planExpiry).toLocaleDateString('en-IN') : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="pt-6 border-t border-neutral-800">
                        <div className="flex items-center gap-4">
                            <MessageSquareText size={24} className="text-cyan-400" />
                            <div>
                                <p className="text-sm text-neutral-400">Remaining Credits</p>
                                <p className="text-lg text-white font-semibold">{businessInfo.credits.toLocaleString('en-IN')}</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default ProfilePage;

