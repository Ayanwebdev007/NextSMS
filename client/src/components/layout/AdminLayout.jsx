import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-[#1e1b4b] via-[#000000] to-[#0f172a] text-white">
            <AdminSidebar />
            <main className="sm:pl-64">
                <div className="p-4 sm:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
