import axios from 'axios';

// 1. Get the backend URL from environment or default to relative root
const BASE = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';

// 2. Build a robust API_BASE_URL (avoiding /api/api and trailing slashes)
let finalBase = BASE.replace(/\/$/, "");
if (finalBase) {
    // If base is set, ensure it has /api but not doubled
    if (!finalBase.endsWith("/api")) {
        finalBase = `${finalBase}/api`;
    }
} else {
    // If serving from same domain, use relative /api
    finalBase = "/api";
}

const api = axios.create({
    baseURL: finalBase,
});

/**
 * AXIOS INTERCEPTOR: Fix for absolute path bypass.
 * If config.url starts with '/', axios ignores the baseURL.
 * We remove the leading slash to ensure baseURL is always respected.
 */
api.interceptors.request.use((config) => {
    if (config.baseURL && config.url && config.url.startsWith('/')) {
        config.url = config.url.substring(1);
    }
    return config;
});

// A helper to create an instance with an auth token
export const createAuthenticatedApi = (token) => {
    const instance = axios.create({
        baseURL: finalBase,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    // Apply the same interceptor to the authenticated instance
    instance.interceptors.request.use((config) => {
        if (config.baseURL && config.url && config.url.startsWith('/')) {
            config.url = config.url.substring(1);
        }
        return config;
    });

    return instance;
};

export default api;
