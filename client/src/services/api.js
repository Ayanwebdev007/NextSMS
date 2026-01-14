import axios from 'axios';

// Get the backend URL - if serving from same domain, we can use relative path or empty string
const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const API_BASE_URL = BASE ? `${BASE}/api` : '/api';

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
