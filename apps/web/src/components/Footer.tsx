
import { Link } from "react-router-dom";
import { useCompanySettings } from "../CompanySettings";

export default function Footer() {
  const { settings } = useCompanySettings();
  return (
    <footer className="shared-footer footer">
      <div className="footer-grid">
        {/* BRAND */}
        <div>
          <h2>{settings.company_name}</h2>

          <p>
            Luxury Bridal, Event &amp;
            Editorial Makeup.
          </p>
        </div>

        {/* NAVIGATION */}
        <div>
          <h3>Navigation</h3>

          <a href="/#home">Home</a>
          <a href="/#about">About</a>
          <a href="/#services">Services</a>

          <Link to="/contact">
            Contact
          </Link>
        </div>

        {/* SERVICES */}
        <div>
          <h3>Services</h3>

          <a href="/#services">
            Bridal Makeup
          </a>

          <a href="/#services">
            Engagement Makeup
          </a>

          <a href="/#services">
            Party Makeup
          </a>

          <a href="/#reviews">
            Client Reviews
          </a>
        </div>

        {/* CONTACT */}
        <div>
          <h3>Contact</h3>

          <Link to="/contact">
            Enquiries
          </Link>

          <p>Delhi, India</p>
        </div>

        {/* CONNECT */}
        <div>
          <h3>Connect With {settings.company_name}</h3>

          <div className="socials">
            <Link to="/contact">
              Get in Touch
            </Link>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {settings.company_name}.
          All Rights Reserved.
        </span>

        <span>Privacy · Terms</span>
      </div>
    </footer>
  );
}