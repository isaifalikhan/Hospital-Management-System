import client from './client';

export const authApi = {
  login: (username, password) => client.post('/auth/login', { username, password }),
  me: () => client.get('/auth/me'),
  changePassword: (data) => client.post('/auth/change-password', data),
};

export const dashboardApi = {
  summary: () => client.get('/dashboard/summary'),
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
