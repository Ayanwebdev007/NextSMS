import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { LoaderCircle, Gem, CalendarDays, CalendarX, Coins, Tag, AlertTriangle } from 'lucide-react';

const PlanPurchasedCard = () => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg flex items-center justify-center min-h-[250px]">
                <LoaderCircle size={24} className="animate-spin text-neutral-500" />
            </div>
        );
    }

    if (!user) {
         return (
             <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-full">
                <h2 className="text-xl font-bold text-white mb-4">No Active Plan</h2>
                <p className="text-neutral-400 mb-6">Log in to see your plan details.</p>
            </div>
        )
    }

    const isPlanExpired = user.planExpiry ? new Date() > new Date(user.planExpiry) : true;

    // --- CASE 1: USER HAS A PURCHASED, ACTIVE PLAN ---
    if (user.plan && !isPlanExpired) {
        const expiryDate = new Date(user.planExpiry);
        const purchaseDate = user.plan.validityDays 
            ? new Date(expiryDate.getTime() - (user.plan.validityDays * 24 * 60 * 60 * 1000))
            : null;

        return (
            <div className="bg-black/80 backdrop-blur-sm border border-neutral-800 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6">Current Plan Details</h2>
                {/* --- THIS IS THE FIXED SECTION --- */}
                <div className="space-y-5 text-neutral-300">
                    <div className="flex items-center gap-3" title="Plan Name">
                        <Gem size={18} className="text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">Plan Name</p>
                            <span className="font-semibold text-white">{user.plan.name}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3" title="Plan Price">
                        <Tag size={18} className="text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">Price</p>
                            <span className="font-semibold text-white">₹{(user.plan.price / 100).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                    {purchaseDate && (
                        <div className="flex items-center gap-3" title="Purchase Date">
                            <CalendarDays size={18} className="text-cyan-400 flex-shrink-0" />
                            <div>
                                <p className="text-xs text-neutral-500">Purchased On</p>
                                <span className="font-semibold text-white">{purchaseDate.toLocaleDateString('en-IN')}</span>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-3" title="Expiry Date">
                        <CalendarX size={18} className="text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">Expires On</p>
                            <span className="font-semibold text-white">{expiryDate.toLocaleDateString('en-IN')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 pt-3 border-t border-neutral-800" title="Credits Received">
                        <Coins size={18} className="text-cyan-400 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-neutral-500">Credits from Plan</p>
                            <span className="font-bold text-white text-lg">{user.plan.credits.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
                 {/* --- END OF FIX --- */}
            </div>
        );
    }

    // --- CASE 2: USER IS ON THE FREE TRIAL (AND IT'S NOT EXPIRED) ---
    if (!user.plan && user.credits > 0 && !isPlanExpired) {
         const expiryDate = new Date(user.planExpiry);
         return (
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-500/50 rounded-2xl p-6 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6">Trial Plan Active</h2>
                <div className="space-y-5 text-neutral-300">
                    <div className="flex items-center gap-3"><Gem size={18} className="text-cyan-400 flex-shrink-0" /><div><p className="text-xs text-neutral-500">Plan Name</p><span className="font-semibold text-white">Free Trial</span></div></div>
                    <div className="flex items-center gap-3"><CalendarX size={18} className="text-cyan-400 flex-shrink-0" /><div><p className="text-xs text-neutral-500">Trial Expires On</p><span className="font-semibold text-white">{expiryDate.toLocaleDateString('en-IN')}</span></div></div>
                    <div className="flex items-center gap-3 pt-3 border-t border-neutral-800"><Coins size={18} className="text-cyan-400 flex-shrink-0" /><div><p className="text-xs text-neutral-500">Trial Credits Remaining</p><span className="font-bold text-white text-lg">{user.credits}</span></div></div>
                </div>
                 <Link to="/pricing" className="mt-6 block w-full text-center bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-6 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity">
                    Upgrade Plan
                </Link>
            </div>
        );
    }

   
    return (
        <div className="bg-black/80 backdrop-blur-sm border border-yellow-500/50 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center h-full">
           <AlertTriangle size={32} className="text-yellow-400 mb-4" />
           <h2 className="text-xl font-bold text-white mb-4">Plan Expired</h2>
           <p className="text-neutral-400 mb-6">Your plan has expired. Please purchase a new plan to continue sending messages and add credits to your account.</p>
           <Link to="/pricing" className="bg-gradient-to-br from-cyan-500 to-indigo-500 text-white px-6 py-2 rounded-md font-semibold hover:opacity-90 transition-opacity">
               Renew / View Plans
           </Link>
       </div>
   );
};

export default PlanPurchasedCard;

