import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../utils/supabase-client";

const ScanContext = createContext();

export function ScanContextProvider({ children }) {
  const [dicomMetadata, setDicomMetadata] = useState([]);
  const [images, setImages] = useState([]);
  const [scanResult, setScanResult] = useState([]);
  const [user, setUser] = useState(null);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [regularImages, setRegularImages] = useState([]);
  
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    clinical: "",
    date: "",
    fullName: "",
    email: "",
    password: "",
    threshold: 0.5,
  });

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!session;

  const fetchRecentScans = useCallback(async () => {
    if (!user?.id) {
      setScans([]);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("scan_records")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching scans:", error.message);
        setScans([]);
      } else {
        // Process JSONB data - Supabase automatically parses JSONB fields,
        // but we need to ensure the scan.result field is properly handled
        const processedScans = data.map((scan, index) => {
          // Parse JSONB result if it's a string, otherwise use it as-is
          let parsedResult = scan.result;

          if (typeof scan.result === "string") {
            try {
              parsedResult = JSON.parse(scan.result);
            } catch (e) {
              console.error(`Error parsing scan result: ${e.message}`);
            }
          }

          return {
            ...scan,
            displayNumber: index + 1,
            result: parsedResult,
          };
        });

        setScans(processedScans);

        if (processedScans.length > 0) {
          const latestScan = processedScans[processedScans.length - 1];
          setScanResult(latestScan.result);
        }
      }
    } catch (error) {
      console.error("Error fetching scans:", error);
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshScans = useCallback(() => {
    fetchRecentScans();
  }, [fetchRecentScans]);

  useEffect(() => {
    fetchRecentScans();
  }, [fetchRecentScans]);

  return (
    <ScanContext.Provider
      value={{
        dicomMetadata,
        setDicomMetadata,
        images,
        setImages,
        scanResult,
        setScanResult,
        user,
        setUser,
        scans,
        setScans,
        loading,
        setLoading,
        session,
        setSession,
        isAuthenticated,
        formData,
        setFormData,
        refreshScans,
        fetchRecentScans,
        regularImages,
        setRegularImages,
      }}
    >
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  return useContext(ScanContext);
}