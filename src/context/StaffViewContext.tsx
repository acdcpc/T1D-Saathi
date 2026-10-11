// Staff view-mode toggle: clinicians / full-access staff can hop between the
// clinician console and the family (user) side without signing out.
// personalView = false -> clinician console (default for role 'clinician')
// personalView = true  -> family stack (Home, AddPatient, ParentTabs ...)
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

interface StaffViewValue {
  personalView: boolean;
  setPersonalView: (v: boolean) => void;
}

const StaffViewContext = createContext<StaffViewValue>({
  personalView: false,
  setPersonalView: () => {},
});

export function StaffViewProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [personalView, setPersonalView] = useState(false);
  const lastUserRef = useRef<string | null>(null);

  // Reset to the console whenever the signed-in account changes (incl. sign-out -> sign-in).
  useEffect(() => {
    const uid = user?.id ?? null;
    if (lastUserRef.current !== uid) {
      lastUserRef.current = uid;
      setPersonalView(false);
    }
  }, [user?.id]);

  return (
    <StaffViewContext.Provider value={{ personalView, setPersonalView }}>
      {children}
    </StaffViewContext.Provider>
  );
}

export const useStaffView = () => useContext(StaffViewContext);
