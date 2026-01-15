import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const GoogleLoginButton = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleGoogleSuccess = async (credentialResponse) => {
        const toastId = toast.loading("Verifying with Google...");
        try {
            // Send the credential token to your backend
            const response = await api.post('/auth/google', {
                credential: credentialResponse.credential,
            });

            const { token, role } = response.data;
            login(token); // Log the user in with your app's token

            toast.success('Login successful! Welcome.', { id: toastId });

            // Redirect based on role
            if (role === 'admin') {
                navigate('/admin/businesses');
            } else {
                navigate('/dashboard');
            }
        } catch (error) {
            console.error('[GOOGLE-LOGIN] Error:', error);
            console.error('[GOOGLE-LOGIN] Response:', error.response?.data);

            // Show specific error message from backend
            const errorMessage = error.response?.data?.message || 'Google Sign-In failed. Please try again.';
            const errorDetails = error.response?.data?.error;

            toast.error(errorMessage, { id: toastId, duration: 5000 });

            // Log detailed error for debugging
            if (errorDetails) {
                console.error('[GOOGLE-LOGIN] Server Error:', errorDetails);
            }
        }
    };

    const handleGoogleError = (error) => {
        console.error('[GOOGLE-LOGIN] Popup Error:', error);

        if (error?.error === 'popup_closed_by_user') {
            toast.error('Sign-in cancelled. Please complete the Google sign-in to continue.');
        } else if (error?.error === 'access_denied') {
            toast.error('Access denied. Please grant permission to continue with Google.');
        } else if (error?.error === 'popup_blocked') {
            toast.error('Popup blocked! Please allow popups for this site and try again.');
        } else {
            toast.error('Google authentication failed. Please try again.');
        }
    };

    return (
        <div className="flex justify-center w-full">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="filled_black"
                text="continue_with"
                shape="pill"
            />
        </div>
    );
};

export default GoogleLoginButton;
