"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  loadSessionContext,
  subscribeToSessionAttendance,
  useMinistryCollection,
  type SessionContext
} from "@kcl/firebase";
import type { Attendance, ServiceSession } from "@kcl/types";

const SESSION_KEY = "kcl-volunteer-session";

type VolunteerContextValue = {
  sessions: ServiceSession[];
  sessionsLoading: boolean;
  sessionContext: SessionContext | null;
  attendance: Attendance[];
  attendanceError: string;
  online: boolean;
  selecting: boolean;
  selectSession(session: ServiceSession): Promise<void>;
  refreshSession(): Promise<void>;
  leaveSession(): void;
};

const VolunteerContext = createContext<VolunteerContextValue | null>(null);

export function VolunteerOperationsProvider({ children }: { children: ReactNode }) {
  const source = useMinistryCollection<ServiceSession>("serviceSessions");
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [attendanceError, setAttendanceError] = useState("");
  const [online, setOnline] = useState(true);
  const [selecting, setSelecting] = useState(false);

  const selectSession = useCallback(async (session: ServiceSession) => {
    setSelecting(true);
    try {
      const context = await loadSessionContext(session);
      setSessionContext(context);
      localStorage.setItem(SESSION_KEY, session.id);
    } finally {
      setSelecting(false);
    }
  }, []);

  const leaveSession = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setSessionContext(null);
    setAttendance([]);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!sessionContext) return;
    const current = source.data.find((item) => item.id === sessionContext.session.id);
    if (!current || current.status !== "OPEN") {
      leaveSession();
      return;
    }
    setSessionContext(await loadSessionContext(current));
  }, [sessionContext, source.data, leaveSession]);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (source.loading || sessionContext) return;
    const saved = localStorage.getItem(SESSION_KEY);
    const session = source.data.find(
      (item) => item.id === saved && item.status === "OPEN"
    );
    if (session) void selectSession(session);
    else if (saved) localStorage.removeItem(SESSION_KEY);
  }, [source.loading, source.data, sessionContext, selectSession]);

  useEffect(() => {
    if (!sessionContext) return;
    const current = source.data.find((item) => item.id === sessionContext.session.id);
    if (
      current &&
      (current.revision || 0) !== (sessionContext.session.revision || 0)
    ) {
      void loadSessionContext(current).then(setSessionContext);
    }
  }, [source.data, sessionContext]);

  useEffect(() => {
    if (!sessionContext) return;
    return subscribeToSessionAttendance(
      sessionContext.session.id,
      (records) => {
        setAttendance(records);
        setAttendanceError("");
      },
      setAttendanceError
    );
  }, [sessionContext]);

  const value = useMemo<VolunteerContextValue>(() => ({
    sessions: source.data,
    sessionsLoading: source.loading,
    sessionContext,
    attendance,
    attendanceError,
    online,
    selecting,
    selectSession,
    refreshSession,
    leaveSession
  }), [source.data, source.loading, sessionContext, attendance, attendanceError, online, selecting, selectSession, refreshSession, leaveSession]);

  return <VolunteerContext.Provider value={value}>{children}</VolunteerContext.Provider>;
}

export function useVolunteerOperations() {
  const value = useContext(VolunteerContext);
  if (!value) throw new Error("VolunteerOperationsProvider missing");
  return value;
}
