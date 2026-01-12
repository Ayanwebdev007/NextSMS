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
            const errorMessage = error.response?.data?.message || 'Google Sign-In failed.';
            toast.error(errorMessage, { id: toastId });
        }
    };

    const handleGoogleError = () => {
        toast.error('Google authentication failed. Please try again.');
    };

    return (
        <div className="flex justify-center w-full">
            <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap 
                theme="filled_black"
                text="continue_with"
                shape="pill"
            />
        </div>
    );
};

export default GoogleLoginButton;
