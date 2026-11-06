import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import AdminNavigation from "../components/AdminNavigation";
import type { ArtistDetails } from "../components/ArtistSection";
import "../testimonials-admin.css";
import "../company-details.css";
import "../artist-admin.css";

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

const EMPTY: ArtistDetails = {
  section_label: "THE ARTIST",
  artist_name: "Namrata Vij",
  professional_title: "International Luxury Makeup Artist · Beauty Educator · Entrepreneur",
  biography: "",
  photo_url: "/pictures/home-self.png",
};

async function getAccessToken() {
  if (!supabase) throw new Error("Supabase frontend configuration is missing.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Session expired. Sign in again from Admin Dashboard.");
  return data.session.access_token;
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  const result: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = result as { error?: string };
    throw new Error(details.error || `Request failed (HTTP ${response.status})`);
  }
  return result as T;
}

export default function ArtistAdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [form, setForm] = useState<ArtistDetails>({ ...EMPTY });
  const [saved, setSaved] = useState<ArtistDetails>({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return;
      setSession(data.session);
      if (authError) setError(authError.message);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => {
      if (active) { setSession(value); setAuthReady(true); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session?.user.id) { setForm({ ...EMPTY }); return; }
    let active = true;
    setLoading(true);
    setError("");
    void adminRequest<ArtistDetails>("/admin/artist-details")
      .then((data) => { if (active) { setForm(data); setSaved(data); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Unable to load artist details."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session?.user.id]);

  async function reload() {
    setLoading(true);
    setError(""); setNotice("");
    try {
      const data = await adminRequest<ArtistDetails>("/admin/artist-details");
      setForm(data); setSaved(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to refresh.");
    } finally { setLoading(false); }
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setError(""); setNotice("");
    const types = ["image/jpeg", "image/png", "image/webp"];
    if (!types.includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
      setError("Choose a JPG, PNG or WebP image smaller than 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const result = await adminRequest<{ photo_url: string }>("/admin/artist-details/upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setForm((previous) => ({ ...previous, photo_url: result.photo_url }));
      setNotice("Photo uploaded. Select Save Artist Details to publish it.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    setError(""); setNotice(""); setSaving(true);
    try {
      const payload: ArtistDetails = {
        section_label: form.section_label.trim(),
        artist_name: form.artist_name.trim(),
        professional_title: form.professional_title.trim(),
        biography: form.biography.trim(),
        photo_url: form.photo_url,
      };
      const data = await adminRequest<ArtistDetails>("/admin/artist-details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setForm(data); setSaved(data);
      setNotice("Artist details saved. Refresh the public website to see the changes.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save artist details.");
    } finally { setSaving(false); }
  }

  const busy = saving || loading || uploading;
  return (
    <div className="testimonial-admin cc-admin-unified cc-artist-admin">
      <AdminNavigation email={session?.user.email} onSignOut={() => supabase?.auth.signOut().then(() => {})} />
      <main className="testimonial-content cc-artist-content">
        <header className="testimonial-header">
          <div><p className="testimonial-eyebrow">JOVIA MUA / WEBSITE MANAGEMENT</p><h1>The Artist</h1></div>
          <button type="button" className="testimonial-outline" onClick={() => void reload()} disabled={busy || !session}>Refresh</button>
        </header>
        <section className="testimonial-panel cc-artist-panel">
          <div className="testimonial-panel-heading">
            <div><p className="testimonial-eyebrow">ABOUT THE ARTIST</p><h2>Artist Profile</h2><p>Manage the portrait and biography displayed on the home page.</p></div>
          </div>
          {!authReady ? <p>Checking admin session...</p> :
            !supabase ? <p role="alert">Supabase frontend environment variables are missing.</p> :
            !session ? <p>Please <a href="/admin">sign in</a> to edit the artist profile.</p> :
            <form className="cc-artist-form" onSubmit={(event) => void save(event)}>
              <div className="cc-artist-layout">
                <div className="cc-artist-photo-column">
                  <label className="cc-artist-label">Artist Photo</label>
                  <div className="cc-artist-photo-preview">
                    {form.photo_url ? <img src={form.photo_url} alt={`${form.artist_name} portrait preview`} /> : <span>No artist photo selected</span>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="cc-artist-file" aria-label="Select artist photo" disabled={busy} onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
                  <button type="button" className="testimonial-outline" onClick={() => fileRef.current?.click()} disabled={busy}>{uploading ? "Uploading..." : "Upload / Replace Photo"}</button>
                  <button type="button" className="cc-artist-remove" onClick={() => setForm((current) => ({ ...current, photo_url: null }))} disabled={busy || !form.photo_url}>Remove Photo</button>
                  <small>JPG, PNG, WebP. Maximum 5 MB. Save to publish changes.</small>
                </div>
                <div className="cc-artist-fields">
                  <label className="cc-artist-field" htmlFor="artist-section-label">Section Label<input id="artist-section-label" value={form.section_label} maxLength={80} minLength={2} required disabled={busy} onChange={(event) => setForm((current) => ({ ...current, section_label: event.target.value }))} /></label>
                  <label className="cc-artist-field" htmlFor="artist-name">Artist Name<input id="artist-name" value={form.artist_name} maxLength={160} minLength={2} required disabled={busy} onChange={(event) => setForm((current) => ({ ...current, artist_name: event.target.value }))} /></label>
                  <label className="cc-artist-field" htmlFor="artist-title">Professional Title<textarea id="artist-title" value={form.professional_title} maxLength={400} minLength={2} rows={2} required disabled={busy} onChange={(event) => setForm((current) => ({ ...current, professional_title: event.target.value }))} /></label>
                  <label className="cc-artist-field" htmlFor="artist-biography">Biography<textarea id="artist-biography" value={form.biography} maxLength={10000} minLength={20} rows={10} required disabled={busy} onChange={(event) => setForm((current) => ({ ...current, biography: event.target.value }))} /><small>Separate paragraphs with a blank line. {form.biography.length}/10000 characters</small></label>
                </div>
              </div>
              {error && <div className="cc-artist-alert cc-artist-error" role="alert">{error}</div>}
              {notice && <div className="cc-artist-alert cc-artist-success" role="status">{notice}</div>}
              <div className="cc-artist-actions">
                <button type="button" className="testimonial-outline" onClick={() => { setForm({ ...saved }); setNotice(""); setError(""); }} disabled={busy}>Cancel Changes</button>
                <button type="submit" className="testimonial-primary" disabled={busy}>{saving ? "Saving..." : "Save Artist Details"}</button>
              </div>
            </form>
          }
        </section>
      </main>
    </div>
  );
}