
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CompanySettings = {
  company_name: string;
  instagram_url: string;
  whatsapp_number: string;
};

export const DEFAULT_COMPANY: CompanySettings = {
  company_name: "Cult Contour",
  instagram_url: "",
  whatsapp_number: "",
};

type CompanyContextValue = {
  settings: CompanySettings;
  refreshSettings: () => Promise<void>;
};

const CompanyContext =
  createContext<CompanyContextValue | null>(null);

const API_BASE = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

export function CompanySettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [settings, setSettings] =
    useState<CompanySettings>(DEFAULT_COMPANY);

  const refreshSettings = useCallback(async () => {
    const response = await fetch(
      `${API_BASE}/company-details`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Unable to fetch company settings (${response.status})`
      );
    }

    const data =
      (await response.json()) as Partial<CompanySettings>;

    setSettings({
      company_name:
        data.company_name?.trim() ||
        DEFAULT_COMPANY.company_name,

      instagram_url:
        data.instagram_url || "",

      whatsapp_number:
        data.whatsapp_number || "",
    });
  }, []);

  useEffect(() => {
    void refreshSettings().catch((error) => {
      console.error(
        "Unable to load company settings:",
        error
      );
    });
  }, [refreshSettings]);

  const value = useMemo(
    () => ({
      settings,
      refreshSettings,
    }),
    [settings, refreshSettings]
  );

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanySettings() {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error(
      "useCompanySettings must be used inside CompanySettingsProvider"
    );
  }

  return context;
}
