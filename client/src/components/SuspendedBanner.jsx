import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { AlertTriangle } from 'lucide-react';

const SuspendedBanner = () => {
    const { user } = useAuth();

    if (!user || user.status !== 'suspended') {
        return null;
    }

    return (
        <div className="bg-yellow-900 border-b-2 border-yellow-600 text-yellow-200 px-4 py-3" role="alert">
            <div className="container mx-auto flex items-center">
                <AlertTriangle className="h-6 w-6 mr-3" />
                <div>
                    <p className="font-bold">Account Suspended</p>
                    <p className="text-sm">Your account has been suspended. You will not be able to send messages. Please contact support for assistance.</p>
                </div>
            </div>
        </div>
    );
};

export default SuspendedBanner;
