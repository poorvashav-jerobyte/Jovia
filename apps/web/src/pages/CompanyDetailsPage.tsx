
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  createClient,
  type Session,
} from "@supabase/supabase-js";

import AdminNavigation from "../components/AdminNavigation";

import "../testimonials-admin.css";
import "../company-details.css";

// ============================================
// TYPES
// ============================================

type CompanyDetails = {
  company_name: string;
  instagram_url: string;
  whatsapp_number: string;
};

type ApiError = {
  error?: string;
  details?: Record<string, string[]>;
};

// ============================================
// CONFIGURATION
// ============================================

const API_BASE = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

// ============================================
// DEFAULT VALUES
// ============================================

const EMPTY: CompanyDetails = {
  company_name: "Jovia MUA",
  instagram_url: "",
  whatsapp_number: "",
};

// ============================================
// INSTAGRAM VALIDATION
// ============================================

function normalizeInstagramUrl(
  value: string
): string | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(
      /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`
    );

    const hostname = url.hostname.toLowerCase();

    const allowedHosts = [
      "instagram.com",
      "www.instagram.com",
    ];

    if (
      url.protocol !== "https:" ||
      !allowedHosts.includes(hostname) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const pathSegments = url.pathname
      .split("/")
      .filter(Boolean);

    // Accept only Instagram profile URLs.
    if (pathSegments.length !== 1) {
      return null;
    }

    const username = pathSegments[0];

    if (
      !/^[a-zA-Z0-9._]{1,30}$/.test(username)
    ) {
      return null;
    }

    // Remove Instagram sharing/tracking parameters.
    return `https://www.instagram.com/${username}/`;
  } catch {
    return null;
  }
}

// ============================================
// WHATSAPP VALIDATION
// ============================================

function normalizeWhatsappNumber(
  value: string
): string {
  return value.replace(/[\s()+-]/g, "");
}

function isValidWhatsappNumber(
  value: string
): boolean {
  return (
    !value ||
    /^[1-9][0-9]{7,14}$/.test(value)
  );
}

// ============================================
// API REQUEST
// ============================================

async function requestCompanyDetails(
  method: "GET" | "PUT",
  payload?: CompanyDetails
): Promise<CompanyDetails> {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session) {
    throw new Error(
      "Session expired. Please sign in again from the Admin Dashboard."
    );
  }

  const response = await fetch(
    `${API_BASE}/admin/company-details`,
    {
      method,

      headers: {
        Authorization:
          `Bearer ${session.access_token}`,

        ...(payload
          ? {
              "Content-Type":
                "application/json",
            }
          : {}),
      },

      ...(payload
        ? {
            body: JSON.stringify(payload),
          }
        : {}),
    }
  );

  const result = (
    await response
      .json()
      .catch(() => ({}))
  ) as ApiError & Partial<CompanyDetails>;

  if (!response.ok) {
    const detail =
      result.error ||
      `Request failed (HTTP ${response.status})`;

    if (response.status === 404) {
      throw new Error(
        "Company Details API not found (404). Check the backend endpoint."
      );
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      throw new Error(
        `${detail}. Please check admin login and permissions.`
      );
    }

    if (response.status === 502) {
      throw new Error(
        `${detail}. Please check the Supabase company_details table.`
      );
    }

    if (
      response.status === 400 &&
      result.details
    ) {
      const errors = Object.entries(
        result.details
      )
        .flatMap(
          ([field, messages]) =>
            messages.map(
              (message) =>
                `${field}: ${message}`
            )
        )
        .join("; ");

      throw new Error(
        errors ||
        `${detail} (HTTP 400)`
      );
    }

    throw new Error(
      `${detail} (HTTP ${response.status}).`
    );
  }

  return {
    company_name:
      result.company_name ?? "Jovia MUA",

    instagram_url:
      result.instagram_url ?? "",

    whatsapp_number:
      result.whatsapp_number ?? "",
  };
}

// ============================================
// COMPANY DETAILS PAGE
// ============================================

export default function CompanyDetailsPage() {
  const [session, setSession] =
    useState<Session | null>(null);

  const [ready, setReady] =
    useState(false);

  const [form, setForm] =
    useState<CompanyDetails>(EMPTY);

  const [savedForm, setSavedForm] =
    useState<CompanyDetails>(EMPTY);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(
        ({
          data,
          error: authError,
        }) => {
          if (!active) return;

          if (authError) {
            setError(authError.message);
          }

          setSession(data.session);
          setReady(true);
        }
      );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, value) => {
        if (!active) return;

        setSession(value);
        setReady(true);
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // LOAD COMPANY DETAILS
  // ==========================================

  async function load() {
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const details =
        await requestCompanyDetails("GET");

      setForm(details);
      setSavedForm(details);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load company details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user.id) {
      void load();
    } else {
      setForm(EMPTY);
      setSavedForm(EMPTY);
    }
  }, [session?.user.id]);

  // ==========================================
  // UPDATE FIELDS
  // ==========================================

  function updateField(
    field: keyof CompanyDetails,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setNotice("");
  }

  // ==========================================
  // SAVE COMPANY DETAILS
  // ==========================================

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      saving ||
      loading ||
      !session
    ) {
      return;
    }

    setError("");
    setNotice("");

    const companyName =
      form.company_name.trim();

    const instagramUrl =
      normalizeInstagramUrl(
        form.instagram_url
      );

    const whatsappNumber =
      normalizeWhatsappNumber(
        form.whatsapp_number
      );

    // Company Name
    if (
      companyName.length < 2 ||
      companyName.length > 120
    ) {
      setError(
        "Company Name must contain between 2 and 120 characters."
      );
      return;
    }

    // Instagram URL
    if (instagramUrl === null) {
      setError(
        "Enter a valid Instagram profile URL, for example https://www.instagram.com/username/"
      );
      return;
    }

    // WhatsApp Number
    if (
      !isValidWhatsappNumber(
        whatsappNumber
      )
    ) {
      setError(
        "WhatsApp number must contain 8–15 digits, including country code, without +."
      );
      return;
    }

    // Backend requires all three fields.
    const payload: CompanyDetails = {
      company_name: companyName,
      instagram_url: instagramUrl,
      whatsapp_number: whatsappNumber,
    };

    setSaving(true);

    try {
      const updated =
        await requestCompanyDetails(
          "PUT",
          payload
        );

      setForm(updated);
      setSavedForm(updated);

      setNotice(
        "Company Details saved successfully. Refresh the public website to see your changes."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save company details."
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // CANCEL CHANGES
  // ==========================================

  function cancelChanges() {
    setForm({ ...savedForm });

    setError("");
    setNotice("");
  }

  // ==========================================
  // FORM STATE
  // ==========================================

  const hasChanges =
    JSON.stringify(form) !==
    JSON.stringify(savedForm);

  const disabled =
    saving || loading;

  const instagramPreview =
    normalizeInstagramUrl(
      form.instagram_url
    );

  const whatsappPreview =
    normalizeWhatsappNumber(
      form.whatsapp_number
    );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="testimonial-admin cc-company-admin cc-admin-unified">
      <AdminNavigation
        email={session?.user.email}
        onSignOut={() => {
          void supabase
            ?.auth.signOut()
            .then(() => {});
        }}
      />

      <main className="testimonial-content cc-company-content">
        {/* PAGE HEADER */}

        <header className="testimonial-header">
          <div>
            <p className="testimonial-eyebrow">
              JOVIA MUA / WEBSITE MANAGEMENT
            </p>

            <h1>
              Company Details
            </h1>
          </div>

          <button
            type="button"
            className="testimonial-outline"
            disabled={
              loading ||
              saving ||
              !session
            }
            onClick={() => {
              void load();
            }}
          >
            {loading
              ? "Loading..."
              : "Refresh"}
          </button>
        </header>

        {/* COMPANY DETAILS PANEL */}

        <section className="testimonial-panel cc-company-panel">
          <div className="testimonial-panel-heading cc-company-panel-heading">
            <div>
              <p className="testimonial-eyebrow">
                COMPANY & CONTACT SETTINGS
              </p>

              <h2>
                Website Information
              </h2>

              <p className="cc-company-description">
                Manage your company name,
                Instagram profile and WhatsApp
                contact information displayed
                on the public website.
              </p>
            </div>
          </div>

          {/* SESSION CHECKING */}

          {!ready ? (
            <p className="cc-company-state">
              Checking admin session...
            </p>
          ) : !supabase ? (
            <p
              role="alert"
              className="cc-company-alert error"
            >
              Supabase environment variables
              are missing.
            </p>
          ) : !session ? (
            <p className="cc-company-state">
              Please{" "}
              <a href="/admin">
                sign in
              </a>{" "}
              to manage company settings.
            </p>
          ) : (
            <form
              className="cc-company-form"
              onSubmit={save}
            >
              {/* ==============================
                  COMPANY NAME
                 ============================== */}

              <div className="cc-company-field">
                <label htmlFor="company-name">
                  Company Name
                </label>

                <input
                  id="company-name"
                  type="text"
                  maxLength={120}
                  placeholder="Jovia MUA"
                  autoComplete="organization"
                  value={form.company_name}
                  onChange={(event) =>
                    updateField(
                      "company_name",
                      event.target.value
                    )
                  }
                  disabled={disabled}
                  required
                />

                <small>
                  This name is displayed in
                  your website header,
                  homepage and footer.
                </small>
              </div>

              {/* ==============================
                  INSTAGRAM PROFILE URL
                 ============================== */}

              <div className="cc-company-field">
                <label htmlFor="company-instagram">
                  Instagram Profile URL
                </label>

                <input
                  id="company-instagram"
                  type="text"
                  inputMode="url"
                  maxLength={400}
                  placeholder="https://www.instagram.com/yourprofile/"
                  autoComplete="url"
                  value={form.instagram_url}
                  onChange={(event) =>
                    updateField(
                      "instagram_url",
                      event.target.value
                    )
                  }
                  disabled={disabled}
                />

                <small>
                  Used by the Follow on
                  Instagram button and
                  social links on your website.
                </small>

                {form.instagram_url.trim() &&
                  instagramPreview && (
                    <div className="cc-company-link-preview">
                      Profile link:{" "}
                      <a
                        href={instagramPreview}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "inherit",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {instagramPreview}
                      </a>
                    </div>
                  )}
              </div>

              {/* ==============================
                  WHATSAPP NUMBER
                 ============================== */}

              <div className="cc-company-field">
                <label htmlFor="company-whatsapp">
                  WhatsApp Number
                </label>

                <input
                  id="company-whatsapp"
                  type="tel"
                  inputMode="tel"
                  maxLength={24}
                  placeholder="919876543210"
                  autoComplete="tel"
                  value={form.whatsapp_number}
                  onChange={(event) =>
                    updateField(
                      "whatsapp_number",
                      event.target.value
                    )
                  }
                  disabled={disabled}
                />

                <small>
                  Include the country code
                  (91 for India). No plus sign
                  is necessary.
                </small>

                {whatsappPreview &&
                  isValidWhatsappNumber(
                    whatsappPreview
                  ) && (
                    <div className="cc-company-link-preview">
                      Chat link:{" "}
                      <a
                        href={`https://wa.me/${whatsappPreview}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "inherit",
                          overflowWrap: "anywhere",
                        }}
                      >
                        https://wa.me/
                        {whatsappPreview}
                      </a>
                    </div>
                  )}
              </div>

              {/* ==============================
                  ERROR MESSAGE
                 ============================== */}

              {error && (
                <div
                  className="cc-company-alert error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* ==============================
                  SUCCESS MESSAGE
                 ============================== */}

              {notice && (
                <div
                  className="cc-company-alert success"
                  role="status"
                >
                  {notice}
                </div>
              )}

              {/* ==============================
                  ACTION BUTTONS
                 ============================== */}

              <div className="cc-company-form-footer">
                <span>
                  Saved changes will appear
                  on the website after refresh.
                </span>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    className="testimonial-outline"
                    onClick={cancelChanges}
                    disabled={
                      disabled ||
                      !hasChanges
                    }
                  >
                    Cancel Changes
                  </button>

                  <button
                    type="submit"
                    className="testimonial-primary"
                    disabled={disabled}
                  >
                    {saving
                      ? "Saving..."
                      : "Save Company Details"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
