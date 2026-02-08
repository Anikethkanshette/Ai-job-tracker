import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,

            login: async (email, password) => {
                try {
                    const response = await api.post('/auth/login', { email, password });
                    const { token, user } = response.data;

                    set({
                        user,
                        token,
                        isAuthenticated: true
                    });

                    // Set token for future requests
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

                    return { success: true, user };
                } catch (error) {
                    return {
                        success: false,
                        error: error.response?.data?.error || 'Login failed'
                    };
                }
            },

            logout: async () => {
                try {
                    await api.post('/auth/logout');
                } catch (error) {
                    console.error('Logout error:', error);
                } finally {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false
                    });
                    delete api.defaults.headers.common['Authorization'];
                }
            },

            updateUser: (updates) => {
                set((state) => ({
                    user: { ...state.user, ...updates }
                }));
            },

            verifyToken: async () => {
                const token = get().token;
                if (!token) {
                    return false;
                }

                try {
                    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    const response = await api.get('/auth/verify');
                    set({ user: response.data.user });
                    return true;
                } catch (error) {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false
                    });
                    delete api.defaults.headers.common['Authorization'];
                    return false;
                }
            }
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
);
