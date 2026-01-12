import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoaderCircle } from 'lucide-react';

const AdminProtectedRoute = () => {
    const { user, isLoading, token } = useAuth();


    if (isLoading) {
        return (
            <div className="min-h-screen w-full bg-black flex items-center justify-center">
                <LoaderCircle className="animate-spin text-white h-12 w-12" />
            </div>
        );
    }

    if (token && user?.role === 'admin') {
        return <Outlet />; 
    }

    return <Navigate to="/dashboard" />;
};

export default AdminProtectedRoute;