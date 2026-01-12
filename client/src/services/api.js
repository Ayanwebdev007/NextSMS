import axios from 'axios';

// Get the backend URL from the environment variables
const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'https://nextsms-backend.onrender.com';
const API_BASE_URL = `${BASE}/api`;

const api = axios.create({
    baseURL: API_BASE_URL,
});

// A helper to create an instance with an auth token
export const createAuthenticatedApi = (token) => {
    return axios.create({
        baseURL: API_BASE_URL,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
};

export default api;
