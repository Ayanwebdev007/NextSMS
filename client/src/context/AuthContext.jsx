import React, { createContext, useState, useEffect, useCallback } from 'react';
import { createAuthenticatedApi } from '../services/api';

export const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async (currentToken, isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            console.log("AuthContext: Starting initial user fetch...");
        }

        if (!currentToken) {
            if (!isBackgroundRefresh) setIsLoading(false);
            return;
        }

        try {
           
            const api = createAuthenticatedApi(currentToken);
            
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error("AuthContext: API call failed. Logging out.", error.message);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
        } finally {
            if (!isBackgroundRefresh) {
                console.log("AuthContext: Initial fetch finished. Setting loading to false.");
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchUser(token);
    }, [token, fetchUser]);

    useEffect(() => {
        let intervalId;
        if (token) {
            intervalId = setInterval(() => {
                fetchUser(token, true); // `true` indicates it's a background refresh
            }, 30000); 
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [token, fetchUser]);


    const login = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const value = { token, user, isLoading, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

