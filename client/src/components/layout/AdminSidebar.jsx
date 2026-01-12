import React from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, Building, AppWindow, LogOut,Inbox } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const AdminSidebar = () => {
    const { logout } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success("Admin logged out.");
        window.location.href = '/login'; 
    };

    const baseLinkClass = "flex items-center gap-3 rounded-lg px-3 py-2 text-neutral-400 transition-all hover:text-white hover:bg-neutral-800";
    const activeLinkClass = "bg-neutral-800 text-white";

    return (
        <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-neutral-800 bg-black sm:flex">
            <div className="flex h-16 items-center gap-3 border-b border-neutral-800 px-6">
                <Shield className="h-6 w-6 text-cyan-400" />
                <span className="text-xl font-bold text-white">Admin Panel</span>
            </div>
            <nav className="flex flex-col flex-grow p-4">
                <ul className="flex flex-col gap-1 flex-grow">
                    <li>
                        <NavLink
                            to="/admin/businesses"
                            className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        >
                            <Building className="h-5 w-5" />
                            Manage Businesses
                        </NavLink>
                    </li>
                    <li>
                        <NavLink
                            to="/admin/plans"
                            className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        >
                            <AppWindow className="h-5 w-5" />
                            Manage Plans
                        </NavLink>
                    </li>
                     <li>
                        <NavLink
                            to="/admin/submissions"
                            className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : ''}`}
                        >
                            <Inbox className="h-5 w-5" />
                            Inbox
                        </NavLink>
                    </li>-
                </ul>
                <div className="mt-auto">
                     <button
                        onClick={handleLogout}
                        className={`${baseLinkClass} w-full`}
                    >
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </div>
            </nav>
        </aside>
    );
};

export default AdminSidebar;
