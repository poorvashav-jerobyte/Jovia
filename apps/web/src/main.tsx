
import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  useLocation,
} from "react-router-dom";

import App from "./App";
import { CompanySettingsProvider } from "./CompanySettings";
import AdminPage from "./pages/AdminPage";
import ServicesPage from "./pages/ServicesPage";
import TestimonialsPage from "./pages/TestimonialsPage";
import CompanyDetailsPage from "./pages/CompanyDetailsPage";
import ArtistAdminPage from "./pages/ArtistAdminPage";
import UserAccessPage from "./pages/UserAccessPage";
import { AdminAccessGate } from "./AdminAccess";
import "./user-access.css";

import "./original.css";
import "./styles.css";
import "./admin.css";
import "./company-details.css";
import "./services-admin.css";

function AdminRoot() {
  const { pathname } = useLocation();

  if (pathname === "/admin/user-access" || pathname === "/admin/user-access/") {
    return <UserAccessPage />;
  }

  if (pathname === "/admin/artist" || pathname === "/admin/artist/") {
    return <ArtistAdminPage />;
  }

  if (
    pathname === "/admin/company-details" || pathname === "/admin/company-details/"
  ) {
    return <CompanyDetailsPage />;
  }

  if (
    pathname === "/admin/testimonials" ||
    pathname === "/admin/testimonials/"
  ) {
    return <TestimonialsPage />;
  }

  if (
    pathname === "/admin/services" ||
    pathname === "/admin/services/"
  ) {
    return <ServicesPage />;
  }

  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return <AdminPage />;
  }

  return <App />;
}

function Root() {
  const { pathname } = useLocation();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminAccessGate><AdminRoot /></AdminAccessGate>;
  }
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <CompanySettingsProvider>
        <Root />
      </CompanySettingsProvider>
    </BrowserRouter>
  </React.StrictMode>
);

import "./admin-common.css";
import "./admin-unified.css";

import "./website-header.css";