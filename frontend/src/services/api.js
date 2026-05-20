import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medcds_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('medcds_token');
      localStorage.removeItem('medcds_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTH =====
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ===== PATIENT PROFILE =====
export const patientAPI = {
  getProfile: () => api.get('/patient/profile'),
  updateProfile: (data) => api.put('/patient/profile', data),
  addAllergy: (data) => api.post('/patient/allergies', data),
  removeAllergy: (id) => api.delete(`/patient/allergies/${id}`),
  addMedication: (data) => api.post('/patient/medications', data),
  removeMedication: (id) => api.delete(`/patient/medications/${id}`),
  addCondition: (data) => api.post('/patient/conditions', data),
  removeCondition: (id) => api.delete(`/patient/conditions/${id}`),
  addSurgery: (data) => api.post('/patient/surgeries', data),
  addVitalSigns: (data) => api.post('/patient/vitals', data),
  addFamilyHistory: (data) => api.post('/patient/family-history', data),
  getFHIR: () => api.get('/patient/fhir'),
};

// ===== ASSESSMENTS =====
export const assessmentAPI = {
  create: (data) => api.post('/assessment', data),
  getAll: (params) => api.get('/assessment', { params }),
  getById: (id) => api.get(`/assessment/${id}`),
  getStatus: (id) => api.get(`/assessment/${id}/status`),
  extractLab: (data) => api.post('/assessment/extract-lab', data),
};

// ===== REPORTS =====
export const reportAPI = {
  getAll: (params) => api.get('/report', { params }),
  getById: (id) => api.get(`/report/${id}`),
  download: (id) => api.get(`/report/${id}/download`, { responseType: 'blob' }),
  regenerate: (id) => api.post(`/report/${id}/regenerate`),
};

// ===== DRUGS =====
export const drugAPI = {
  getInfo: (name) => api.get(`/drug/info/${name}`),
  getRxCUI: (name) => api.get(`/drug/rxcui/${name}`),
};

export default api;
