import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('medcds_user') || 'null'),
  token: localStorage.getItem('medcds_token') || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.login({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('medcds_token', token);
      localStorage.setItem('medcds_user', JSON.stringify(user));
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await authAPI.register(data);
      const { token, user } = res.data;
      localStorage.setItem('medcds_token', token);
      localStorage.setItem('medcds_user', JSON.stringify(user));
      set({ token, user, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('medcds_token');
    localStorage.removeItem('medcds_user');
    set({ user: null, token: null, error: null });
  },

  refreshUser: async () => {
    try {
      const res = await authAPI.getMe();
      const user = res.data.user;
      localStorage.setItem('medcds_user', JSON.stringify(user));
      set({ user });
    } catch {}
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
