import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import Footer from './Footer';
const PublicLayout = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] via-[#000000] to-[#1e1b4b]">
            <PublicNavbar />
            {/* The Outlet component renders the specific page (Home, Pricing) */}
            <main className="flex-grow">
                <Outlet />
            </main>
            <Footer/>
        </div>
    );
};

export default PublicLayout;
