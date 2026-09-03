import client from './client';
import portalClient from './portalClient';

export const authApi = {
  login: (username, password) => client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary'),
  analytics: () => client.get('/dashboard/analytics'),
  ownerInsights: (params) => client.get('/dashboard/owner-insights', { params }),
};

export const patientsApi = {
  list: (params) => client.get('/patients', { params }),
  get: (id) => client.get(`/patients/${id}`),
  create: (data) => client.post('/patients', data),
  update: (id, data) => client.put(`/patients/${id}`, data),
  remove: (id) => client.delete(`/patients/${id}`),
  setPortalPin: (id, data) => client.put(`/patients/${id}/portal-pin`, data),
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

export const attachmentsApi = {
  list: (entityType, entityId) => client.get('/attachments', { params: { entityType, entityId } }),
  upload: (entityType, entityId, file) => {
    const form = new FormData();
    form.append('entityType', entityType);
    form.append('entityId', entityId);
    form.append('file', file);
    return client.post('/attachments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  remove: (id) => client.delete(`/attachments/${id}`),
  // Fetches the raw file as a blob (goes through the shared client, so the
  // auth header is attached same as any other request) and hands back an
  // object URL — the caller owns it and must revoke it when done.
  getObjectUrl: async (id) => {
    const res = await client.get(`/attachments/${id}/file`, { responseType: 'blob' });
    return window.URL.createObjectURL(res.data);
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

export const adminApi = {
  // Streams the full system backup (a timestamped SQLite file copy locally,
  // or a JSON export of every table when running on hosted Postgres — the
  // backend decides which) and saves it under the filename the server chose.
  downloadBackup: async () => {
    const res = await client.get('/admin/backup', { responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match ? match[1] : `hms-backup-${Date.now()}`;
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

export const usersApi = {
  list: () => client.get('/users'),
  create: (data) => client.post('/users', data),
  update: (id, data) => client.put(`/users/${id}`, data),
  remove: (id) => client.delete(`/users/${id}`),
};

export const attendanceApi = {
  list: (params) => client.get('/attendance', { params }),
  clockIn: () => client.post('/attendance/clock-in'),
  clockOut: () => client.post('/attendance/clock-out'),
};

export const shiftsApi = {
  list: (params) => client.get('/shifts', { params }),
  create: (data) => client.post('/shifts', data),
  update: (id, data) => client.put(`/shifts/${id}`, data),
  remove: (id) => client.delete(`/shifts/${id}`),
};

// Public, unauthenticated booking flow (no token on these calls) — see
// frontend/src/pages/PublicBooking.jsx and backend/routes/publicRoutes.js.
export const publicApi = {
  listDoctors: () => client.get('/public/doctors'),
  availableSlots: (doctorId, date) => client.get(`/public/doctors/${doctorId}/available-slots`, { params: { date } }),
  book: (data) => client.post('/public/appointments', data),
  queue: (date) => client.get('/public/queue', { params: { date } }),
};

export const aiApi = {
  // fields: an object of label -> value, e.g. { Diagnosis: '...', Treatment: '...' }
  generateSummary: (data) => client.post('/ai/summary', data),
};

// Separate portal client/instance/localStorage — see api/portalClient.js.
export const patientPortalApi = {
  login: (phone, pin) => portalClient.post('/login', { phone, pin }),
  me: () => portalClient.get('/me'),
  doctors: () => portalClient.get('/doctors'),
  availableSlots: (doctorId, date) => portalClient.get(`/doctors/${doctorId}/available-slots`, { params: { date } }),
  appointments: () => portalClient.get('/appointments'),
  bookAppointment: (data) => portalClient.post('/appointments', data),
  cancelAppointment: (id) => portalClient.post(`/appointments/${id}/cancel`),
  medicalRecords: () => portalClient.get('/medical-records'),
  invoices: () => portalClient.get('/invoices'),
};
