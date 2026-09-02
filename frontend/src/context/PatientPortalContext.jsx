import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { patientPortalApi } from '../api';

// Deliberately separate from AuthContext (staff login) — different
// localStorage keys, different API client/base URL, different context —
// so the patient portal is a fully independent auth guard from staff auth.
const PatientPortalContext = createContext(null);

export function PatientPortalProvider({ children }) {
  const [patient, setPatient] = useState(() => {
    const stored = localStorage.getItem('hms_patient');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('hms_patient_token');
    if (!token) {
      setLoading(false);
      return;
    }
    patientPortalApi
      .me()
      .then((res) => {
        setPatient(res.data);
        localStorage.setItem('hms_patient', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('hms_patient_token');
        localStorage.removeItem('hms_patient');
        setPatient(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (phone, pin) => {
    const res = await patientPortalApi.login(phone, pin);
    localStorage.setItem('hms_patient_token', res.data.token);
    localStorage.setItem('hms_patient', JSON.stringify(res.data.patient));
    setPatient(res.data.patient);
    return res.data.patient;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('hms_patient_token');
    localStorage.removeItem('hms_patient');
    setPatient(null);
  }, []);

  return (
    <PatientPortalContext.Provider value={{ patient, loading, login, logout }}>
      {children}
    </PatientPortalContext.Provider>
  );
}

export function usePatientPortal() {
  const ctx = useContext(PatientPortalContext);
  if (!ctx) throw new Error('usePatientPortal must be used within PatientPortalProvider');
  return ctx;
}
