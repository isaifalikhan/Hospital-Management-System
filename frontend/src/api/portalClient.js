import axios from 'axios';

// A separate axios instance (separate token, separate storage keys, separate
// 401 redirect target) from ../api/client.js so the patient portal's auth is
// entirely independent of the staff login session — a patient token is
// never sent on a staff request or vice versa, and one session expiring
// doesn't log the other out.
const portalClient = axios.create({
  baseURL: '/api/patient-portal',
});

portalClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('hms_patient_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

portalClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hms_patient_token');
      localStorage.removeItem('hms_patient');
      if (!window.location.pathname.includes('/portal/login')) {
        window.location.href = '/portal/login';
      }
    }
    return Promise.reject(error);
  }
);

export default portalClient;
