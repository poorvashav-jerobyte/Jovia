
import { useEffect, useRef, useState } from "react";
import { useCompanySettings } from "./CompanySettings";
import {
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import Header from "./components/Header";
import BrushHero from "./components/BrushHero";
import BeautyServicesScroll from "./components/BeautyServicesScroll";
import Footer from "./components/Footer";
import Contact from "./components/Contact";

import {
  apiGet,
  type Testimonial,
} from "./lib/api";


// Each client's photos swipe independently inside the review card.
// Native scroll-snap keeps touch interaction smooth without scroll listeners on the page.
function ReviewPhotoCarousel({ photos, author, number }: { photos: string[]; author: string; number: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const showControls = photos.length > 1;

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(photos.length - 1, index));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
    setActive(next);
  };

  const onTrackScroll = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    const next = Math.max(0, Math.min(photos.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
    setActive(old => old === next ? old : next);
  };

  return (
    <div className="client-review-media">
      <div className="client-review-photo">
      <div
        className="client-review-slides"
        ref={trackRef}
        onScroll={onTrackScroll}
        aria-label={`${author} makeup photo gallery`}
        tabIndex={showControls ? 0 : -1}
        onKeyDown={event => {
          if (event.key === "ArrowRight") { event.preventDefault(); goTo(active + 1); }
          if (event.key === "ArrowLeft") { event.preventDefault(); goTo(active - 1); }
        }}
      >
        {photos.length ? photos.map((photo, i) => (
          <div className="client-review-slide" key={`${photo}-${i}`}>
            <img src={photo} alt={`${author} makeup look ${i + 1} of ${photos.length}`} loading="lazy" decoding="async" draggable={false} />
          </div>
        )) : (
          <div className="client-review-slide">
            <div className="client-review-photo-empty">
              <span aria-hidden="true">✦</span>
              <span>CLIENT MOMENTS</span>
              <small>Photo coming soon</small>
            </div>
          </div>
        )}
      </div>
      <span className="client-review-index">{String(number).padStart(2, "0")}</span>
      {showControls && (
        <>
          <span className="client-review-photo-count">{active + 1} / {photos.length}</span>
          <button type="button" className="client-review-arrow client-review-arrow--prev" aria-label={`Previous photo for ${author}`} disabled={active === 0} onClick={() => goTo(active - 1)}>‹</button>
          <button type="button" className="client-review-arrow client-review-arrow--next" aria-label={`Next photo for ${author}`} disabled={active === photos.length - 1} onClick={() => goTo(active + 1)}>›</button>
          <div className="client-review-dots" aria-label="Choose photo">
            {photos.map((_, i) => (
              <button type="button" key={i} onClick={() => goTo(i)} className={i === active ? "is-active" : ""} aria-current={i === active ? "true" : undefined} aria-label={`Show photo ${i + 1} of ${photos.length} for ${author}`} />
            ))}
          </div>
        </>
      )}
      </div>
      {showControls && (
        <div className="client-review-photo-strip" aria-label={`${author} photo thumbnails`}>
          {photos.map((photo, i) => (
            <button
              type="button"
              key={`${photo}-thumb-${i}`}
              className={`client-review-thumb${i === active ? " is-active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Show ${author} makeup photo ${i + 1} of ${photos.length}`}
              aria-pressed={i === active}
            >
              <img src={photo} alt="" loading="lazy" decoding="async" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================================================
// HOMEPAGE
// ==================================================

function Home({ instagramUrl, companyName }: { instagramUrl: string; companyName: string }) {
  const [testimonials, setTestimonials] = useState<
    Testimonial[]
  >([]);

  // Load published testimonials from the backend.

  useEffect(() => {
    let active = true;

    apiGet<Testimonial[]>("/testimonials")
      .then((rows) => {
        if (active) {
          setTestimonials(rows);
        }
      })
      .catch((error) => {
        console.error(
          "Unable to load testimonials:",
          error
        );
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      {/* ============================================
          BRUSH HERO ANIMATION
         ============================================ */}

      <BrushHero />

      {/* ============================================
          ABOUT THE ARTIST
         ============================================ */}

      <section
        className="section about reveal-section is-visible"
        id="about"
      >
        <div className="about-image reveal-item is-visible">
          <div className="img-placeholder portfolio-card portfolio-card--large">
            <img
              src="/pictures/home-self.png"
              alt="Makeup artist portrait"
              loading="lazy"
            />
          </div>
        </div>

        <div className="about-copy reveal-item is-visible">
          <p className="eyebrow">
            THE ARTIST
          </p>

          <h2>Namrata Vij</h2>

          <p className="subline">
            International Luxury Makeup Artist · Beauty
            Educator · Entrepreneur
          </p>

          <p>
            Namrata Vij is an international luxury makeup
            artist known for creating modern, timeless,
            and sophisticated beauty experiences. From
            bridal transformations and destination
            weddings to editorial campaigns, fashion
            shows and special events, she creates looks
            that feel effortlessly elegant and uniquely
            personal.
          </p>

          <p>
            Holding an MBA in Marketing from the
            University of Technology Sydney and founder
            of {companyName}, Namrata brings together
            artistic excellence and a deep understanding
            of client experience.
          </p>

          <a
            href="#services"
            className="text-link"
          >
            Explore the Artistry →
          </a>
        </div>
      </section>

      {/* ============================================
          NEW JOVIA MUA SERVICES SECTION

          Lipstick on left
          Scroll-changing service cards on right
          Service data loaded inside the component
         ============================================ */}

      <BeautyServicesScroll />

      {/* ============================================
          THE STANDARD
         ============================================ */}

      <section className="section standard standard--editorial reveal-section is-visible">
        <div className="standard-ambient" aria-hidden="true" />
        <div className="standard-content">
          <header className="standard-intro">
            <div className="standard-intro-copy">
              <p className="eyebrow standard-eyebrow">
                <span className="standard-eyebrow-line" aria-hidden="true" />
                THE {companyName.toUpperCase()} PROMISE
              </p>
              <h2>
                What Makes <em>{companyName}</em>
                <span> Different.</span>
              </h2>
            </div>
            <div className="standard-intro-aside">
              <span className="standard-aside-mark" aria-hidden="true">✦</span>
              <p>
                Every detail matters. From the first conversation to
                the final touch, your experience is thoughtfully curated.
              </p>
              <span className="standard-aside-caption">BEAUTY WITH INTENTION</span>
            </div>
          </header>

          <div className="standard-grid">
            {[
              {
                number: "01",
                symbol: "✧",
                name: "Premium Products",
                description: "Luxury and professional-grade formulas exclusively.",
                detail: "THE FINEST FINISH",
              },
              {
                number: "02",
                symbol: "◇",
                name: "Customised Looks",
                description: "Every look tailored precisely to your features, skin tone, and occasion.",
                detail: "UNIQUELY YOU",
              },
              {
                number: "03",
                symbol: "◷",
                name: "Long-Wear Artistry",
                description: "Designed to photograph beautifully and last throughout your event.",
                detail: "BEAUTY THAT LASTS",
              },
              {
                number: "04",
                symbol: "✦",
                name: "Hygiene Standards",
                description: "Professional sanitation practices on every appointment.",
                detail: "CARE IN EVERY DETAIL",
              },
            ].map(({ number, symbol, name, description, detail }) => (
              <article className="standard-card reveal-item is-visible" key={name}>
                <div className="standard-card-top">
                  <span className="standard-symbol" aria-hidden="true">{symbol}</span>
                  <span className="standard-number">{number} / 04</span>
                </div>
                <div className="standard-card-body">
                  <span className="standard-card-detail">{detail}</span>
                  <h3>{name}</h3>
                  <p>{description}</p>
                </div>
                <span className="standard-card-rule" aria-hidden="true" />
              </article>
            ))}
          </div>

          <div className="standard-bottom">
            <div className="standard-bottom-note">
              <span className="standard-bottom-star" aria-hidden="true">✳</span>
              <span>A personal approach. An unforgettable result.</span>
            </div>
            <Link className="standard-cta" to="/contact">
              Book a Consultation <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          REAL CLIENT REVIEW PHOTO GALLERY
          Only published feedback returned by the API.
          Photos and ratings appear only when supplied.
         ============================================ */}

      <section
        className="client-review-gallery reveal-section is-visible"
        id="reviews"
        aria-labelledby="client-reviews-heading"
      >
        <div className="client-review-glow" aria-hidden="true" />
        <header className="client-review-heading">
          <div>
            <p className="eyebrow">REAL MOMENTS · REAL WORDS</p>
            <h2 id="client-reviews-heading">
              Beautiful Stories, <em>Beautiful Memories.</em>
            </h2>
          </div>
          <p className="client-review-intro">
            A little love from the people who trusted us with their special moments.
          </p>
        </header>

        {testimonials.length > 0 ? (
          <div className="client-review-grid">
            {testimonials.map((review, index) => {
              const withMedia = review as Testimonial & {
                image_path?: string | null;
                photo_url?: string | null;
                rating?: number | null;
                photos?: string[] | null;
                service_name?: string | null;
                review_date?: string | null;
              };
              const photos = Array.isArray(withMedia.photos) ? withMedia.photos.slice(0, 5) : [];
              if (!photos.length && (withMedia.image_path || withMedia.photo_url)) {
                photos.push((withMedia.image_path || withMedia.photo_url)!);
              }
              const rating =
                typeof withMedia.rating === "number" &&
                Number.isInteger(withMedia.rating) &&
                withMedia.rating >= 1 && withMedia.rating <= 5
                  ? withMedia.rating
                  : null;

              return (
                <article className="client-review-card" key={review.id}>
                  <ReviewPhotoCarousel photos={photos} author={review.author} number={index + 1} />
                  <div className="client-review-details">
                    <div className="client-review-rating">
                      {rating !== null ? (
                        <>
                          <span
                            className="client-review-stars"
                            aria-label={`${rating} out of 5 stars`}
                            role="img"
                          >
                            {Array.from({ length: 5 }, (_, starIndex) => (
                              <span
                                key={starIndex}
                                className={starIndex < rating ? "is-filled" : ""}
                              >★</span>
                            ))}
                          </span>
                          <span className="client-review-rating-label">
                            {rating}.0 / 5
                          </span>
                        </>
                      ) : (
                        <span className="client-review-rating-label">
                          VERIFIED CUSTOMER FEEDBACK
                        </span>
                      )}
                    </div>
                    {withMedia.service_name && <div className="client-review-service">{withMedia.service_name}</div>}
                    <blockquote>“{review.quote}”</blockquote>
                    <div className="client-review-person">
                      <div>
                        <strong>{review.author}</strong>
                        {withMedia.review_date && <small>{new Date(`${withMedia.review_date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>}
                        {review.context && <small>{review.context}</small>}
                      </div>
                      <span aria-hidden="true">✧</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="client-review-empty">
            <span aria-hidden="true">✧</span>
            <h3>Our Client Stories</h3>
            <p>
              Real customer photos, ratings and feedback will appear here
              as soon as they are published.
            </p>
          </div>
        )}
        <div className="client-review-bottom">
          <span>YOUR MOMENT. YOUR STORY.</span>
          <Link to="/contact" className="client-review-cta">
            Create Your Beautiful Moment <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      {/* ============================================
          INSTAGRAM / PORTFOLIO
         ============================================ */}

      <section
        className="section instagram reveal-section is-visible"
        id="portfolio"
      >
        <p className="eyebrow">
          FOLLOW ALONG
        </p>

        <h2>{instagramUrl ? `@${new URL(instagramUrl).pathname.split("/").filter(Boolean)[0] || companyName}` : companyName}</h2>

        {instagramUrl && (
          <a
            className="button button--ghost"
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on Instagram →
          </a>
        )}
      </section>

      {/* ============================================
          FINAL CONSULTATION CTA
         ============================================ */}

      <section
        className="final-cta reveal-section is-visible"
        id="contact"
      >
        <h2>Ready to Begin?</h2>

        <p>
          Whether you are a bride planning your
          wedding beauty, a client preparing for a
          special occasion, or someone who wants to
          learn makeup from the ground up — the
          process begins with a conversation.
        </p>

        <Link
          className="button button--fill"
          to="/contact"
        >
          Book a Consultation
        </Link>
      </section>
    </>
  );
}

// ==================================================
// SCROLL TO HASH
// ==================================================

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const timeout = window.setTimeout(() => {
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({
            behavior: "smooth",
          });
      }, 100);

      return () => window.clearTimeout(timeout);
    }

    window.scrollTo({ top: 0 });
  }, [location.pathname, location.hash]);

  return null;
}

// ==================================================
// APP ROUTES
// ==================================================

export default function App() {
  const { settings: company } = useCompanySettings();
  const whatsappLink = company.whatsapp_number
    ? `https://wa.me/${company.whatsapp_number}`
    : "";
  return (
    <>
      <ScrollToHash />

      <Header />

      <Routes>
        <Route
          path="/"
          element={<Home instagramUrl={company.instagram_url} companyName={company.company_name} />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="*"
          element={
            <main className="not-found">
              <h1>Page not found</h1>

              <Link to="/">
                Return home
              </Link>
            </main>
          }
        />
      </Routes>

      <Footer />

      {whatsappLink && (
        <a
          className="whatsapp-floating"
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          ✿ Chat on WhatsApp
        </a>
      )}
    </>
  );
}