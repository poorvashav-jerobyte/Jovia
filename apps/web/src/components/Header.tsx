
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HeaderCompact.css";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

const links = [
  ["Home", "/#home"],
  ["About", "/#about"],
  ["Services", "/#services"],
  ["Portfolio", "/#portfolio"],
  ["Reviews", "/#reviews"],
  ["Contact", "/contact"],
];

type CompanyDetails = {
  company_name?: string;
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] =
    useState("Jovia MUA");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCompanyName() {
      try {
        const response = await fetch(
          `${API_URL}/company-details`,
          {
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            "Unable to load company details"
          );
        }

        const data: CompanyDetails =
          await response.json();

        const name = data.company_name?.trim();

        if (name) {
          setCompanyName(name);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(
            "Company details:",
            error
          );
        }
      }
    }

    void loadCompanyName();

    return () => {
      controller.abort();
    };
  }, []);

  const closeMenu = () => setOpen(false);

  const nav = links.map(([label, to]) =>
    to.startsWith("/#") ? (
      <a
        key={label}
        href={to}
        onClick={closeMenu}
      >
        {label}
      </a>
    ) : (
      <Link
        key={label}
        to={to}
        onClick={closeMenu}
      >
        {label}
      </Link>
    )
  );

  return (
    <>
      <header className="site-header jovia-compact-glass">
        <Link
          className="logo jovia-glass-logo"
          to="/"
          onClick={closeMenu}
        >
          {companyName}
        </Link>

        <nav
          className="desktop-nav"
          aria-label="Primary navigation"
        >
          {nav}
        </nav>

        <Link
          className="nav-cta"
          to="/contact"
          onClick={closeMenu}
        >
          Book Consultation
        </Link>

        <button
          type="button"
          className="hamburger jovia-glass-menu"
          aria-label={
            open ? "Close menu" : "Open menu"
          }
          aria-expanded={open}
          onClick={() =>
            setOpen((value) => !value)
          }
        >
          <span />
          <span />
        </button>
      </header>

      {open && (
        <div className="mobile-menu">
          <button
            type="button"
            className="menu-close"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>

          {nav}

          <Link
            to="/contact"
            onClick={closeMenu}
          >
            Book Consultation
          </Link>
        </div>
      )}
    </>
  );
}
