import client from './client';

export const authApi = {
  login: (username, password) => client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary'),
  analytics: () => client.get('/dashboard/analytics'),
};

export const patientsApi = {
  list: (params) => client.get('/patients', { params }),
  get: (id) => client.get(`/patients/${id}`),
  create: (data) => client.post('/patients', data),
  update: (id, data) => client.put(`/patients/${id}`, data),
  remove: (id) => client.delete(`/patients/${id}`),
};

export const doctorsApi = {
  list: (params) => client.get('/doctors', { params }),
  get: (id) => client.get(`/doctors/${id}`),
  create: (data) => client.post('/doctors', data),
  update: (id, data) => client.put(`/doctors/${id}`, data),
  remove: (id) => client.delete(`/doctors/${id}`),
  availableSlots: (id, date) => client.get(`/doctors/${id}/available-slots`, { params: { date } }),
};

export const departmentsApi = {
  list: () => client.get('/departments'),
  create: (data) => client.post('/departments', data),
  update: (id, data) => client.put(`/departments/${id}`, data),
  remove: (id) => client.delete(`/departments/${id}`),
};

export const appointmentsApi = {
  list: (params) => client.get('/appointments', { params }),
  get: (id) => client.get(`/appointments/${id}`),
  create: (data) => client.post('/appointments', data),
  update: (id, data) => client.put(`/appointments/${id}`, data),
  remove: (id) => client.delete(`/appointments/${id}`),
};

export const medicalRecordsApi = {
  list: (params) => client.get('/medical-records', { params }),
  get: (id) => client.get(`/medical-records/${id}`),
  create: (data) => client.post('/medical-records', data),
  update: (id, data) => client.put(`/medical-records/${id}`, data),
  remove: (id) => client.delete(`/medical-records/${id}`),
  dispensePrescriptionItem: (itemId) => client.post(`/medical-records/prescription-items/${itemId}/dispense`),
};

export const labOrdersApi = {
  list: (params) => client.get('/lab-orders', { params }),
  get: (id) => client.get(`/lab-orders/${id}`),
  create: (data) => client.post('/lab-orders', data),
  update: (id, data) => client.put(`/lab-orders/${id}`, data),
  remove: (id) => client.delete(`/lab-orders/${id}`),
};

export const admissionsApi = {
  list: (params) => client.get('/admissions', { params }),
  create: (data) => client.post('/admissions', data),
  update: (id, data) => client.put(`/admissions/${id}`, data),
  discharge: (id, data) => client.post(`/admissions/${id}/discharge`, data),
  remove: (id) => client.delete(`/admissions/${id}`),
};

export const auditLogsApi = {
  list: (params) => client.get('/audit-logs', { params }),
};

export const reportsApi = {
  downloadCsv: async (path, filename) => {
    const res = await client.get(path, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const invoicesApi = {
  list: (params) => client.get('/invoices', { params }),
  get: (id) => client.get(`/invoices/${id}`),
  create: (data) => client.post('/invoices', data),
  update: (id, data) => client.put(`/invoices/${id}`, data),
  recordPayment: (id, data) => client.post(`/invoices/${id}/payments`, data),
  remove: (id) => client.delete(`/invoices/${id}`),
};

export const medicinesApi = {
  list: (params) => client.get('/medicines', { params }),
  get: (id) => client.get(`/medicines/${id}`),
  create: (data) => client.post('/medicines', data),
  update: (id, data) => client.put(`/medicines/${id}`, data),
  adjustStock: (id, data) => client.post(`/medicines/${id}/stock`, data),
  remove: (id) => client.delete(`/medicines/${id}`),
};

export const usersApi = {
  list: () => client.get('/users'),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  remove: (id) => client.delete(`/users/${id}`),
};

// Public, unauthenticated booking flow (no token on these calls) — see
// frontend/src/pages/PublicBooking.jsx and backend/routes/publicRoutes.js.
export const publicApi = {
  listDoctors: () => client.get('/public/doctors'),
  availableSlots: (doctorId, date) => client.get(`/public/doctors/${doctorId}/available-slots`, { params: { date } }),
  book: (data) => client.post('/public/appointments', data),
};
