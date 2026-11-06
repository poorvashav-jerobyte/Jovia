import { useCompanySettings } from "../CompanySettings";

import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

const TOTAL_FRAMES = 120;

const frameUrl = (frame: number) =>
  `/brush/ezgif-frame-${String(TOTAL_FRAMES - frame + 1).padStart(3, "0")}.png`;

export default function BrushHero() {
  const { settings } = useCompanySettings();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;

    if (!section || !canvas) return;

    // Preserve non-null DOM references inside nested animation callbacks.
    const safeSection: HTMLElement = section;
    const safeCanvas: HTMLCanvasElement = canvas;

    const context = canvas.getContext("2d", {
      alpha: false,
    });

    if (!context) return;

    const ctx = context;

    const images: Array<HTMLImageElement | undefined> =
      new Array(TOTAL_FRAMES);

    let mounted = true;
    let animationFrame = 0;
    let lastDrawnFrame = -1;
    let currentFrame = 0;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // ==========================================
    // DRAW A FRAME TO CANVAS
    // ==========================================

    function drawFrame(index: number) {
      const image = images[index];

      if (
        !image ||
        !image.complete ||
        image.naturalWidth === 0 ||
        !mounted
      ) {
        return false;
      }

      const width = safeCanvas.clientWidth;
      const height = safeCanvas.clientHeight;

      if (!width || !height) return false;

      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      const pixelWidth = Math.max(
        1,
        Math.floor(width * dpr)
      );

      const pixelHeight = Math.max(
        1,
        Math.floor(height * dpr)
      );

      if (
        safeCanvas.width !== pixelWidth ||
        safeCanvas.height !== pixelHeight
      ) {
        safeCanvas.width = pixelWidth;
        safeCanvas.height = pixelHeight;

        lastDrawnFrame = -1;
      }

      if (index === lastDrawnFrame) {
        return true;
      }

      const scale = Math.max(
        pixelWidth / image.naturalWidth,
        pixelHeight / image.naturalHeight
      );

      const drawnWidth = image.naturalWidth * scale;
      const drawnHeight = image.naturalHeight * scale;

      const offsetX =
        (pixelWidth - drawnWidth) / 2;

      const offsetY =
        (pixelHeight - drawnHeight) / 2;

      ctx.fillStyle = "#090709";

      ctx.fillRect(
        0,
        0,
        pixelWidth,
        pixelHeight
      );

      ctx.drawImage(
        image,
        offsetX,
        offsetY,
        drawnWidth,
        drawnHeight
      );

      lastDrawnFrame = index;

      return true;
    }

    // ==========================================
    // LOAD IMAGE FRAME
    // ==========================================

    function loadFrame(index: number) {
      if (
        index < 0 ||
        index >= TOTAL_FRAMES ||
        images[index]
      ) {
        return;
      }

      const image = new Image();

      images[index] = image;
      image.decoding = "async";

      image.onload = () => {
        if (!mounted) return;

        // Ignore images loaded after the user has moved to another frame.
        if (index === currentFrame) {
          drawFrame(index);
        }
      };

      image.onerror = () => {
        if (!mounted) return;

        console.warn(
          `Brush animation frame unavailable: ${frameUrl(
            index + 1
          )}`
        );
      };

      image.src = frameUrl(index + 1);
    }

    // ==========================================
    // PRELOAD NEARBY FRAMES
    // ==========================================

    function preloadFrames(current: number) {
      loadFrame(current);

      // Preload in both scroll directions for repeatable playback.
      for (let offset = 1; offset <= 12; offset++) {
        loadFrame(current + offset);
        loadFrame(current - offset);
      }
    }

    // ==========================================
    // BIDIRECTIONAL SCROLL ANIMATION
    // ==========================================

    function updateScroll() {
      animationFrame = 0;

      if (!mounted) return;

      const rect = safeSection.getBoundingClientRect();

      const scrollDistance = Math.max(
        1,
        safeSection.offsetHeight - window.innerHeight
      );

      const rawProgress = Math.max(
        0,
        Math.min(1, -rect.top / scrollDistance)
      );

      const calculatedFrame = reducedMotion
        ? 0
        : Math.min(
            TOTAL_FRAMES - 1,
            Math.floor(
              rawProgress * (TOTAL_FRAMES - 1)
            )
          );

      // Follow actual scroll position in either direction.
      // Frame URL mapping remains reversed (120 down to 001).
      currentFrame = calculatedFrame;

      safeSection.style.setProperty(
        "--hero-progress",
        String(rawProgress)
      );

      preloadFrames(currentFrame);

      // Render the frame for the current scroll position.
      drawFrame(currentFrame);
    }

    function scheduleUpdate() {
      if (animationFrame === 0) {
        animationFrame =
          window.requestAnimationFrame(
            updateScroll
          );
      }
    }

    // ==========================================
    // HANDLE WINDOW RESIZE
    // ==========================================

    function handleResize() {
      lastDrawnFrame = -1;
      scheduleUpdate();
    }

    // ==========================================
    // INITIAL PRELOAD
    // ==========================================

    loadFrame(0);

    for (let index = 1; index < 16; index++) {
      loadFrame(index);
    }

    scheduleUpdate();

    window.addEventListener(
      "scroll",
      scheduleUpdate,
      { passive: true }
    );

    window.addEventListener(
      "resize",
      handleResize
    );

    // ==========================================
    // CLEANUP
    // ==========================================

    return () => {
      mounted = false;

      if (animationFrame) {
        window.cancelAnimationFrame(
          animationFrame
        );
      }

      window.removeEventListener(
        "scroll",
        scheduleUpdate
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-scroll"
      id="home"
      aria-label={`${settings.company_name} cinematic makeup brush hero`}
    >
      <div className="hero-sticky">
        {/* ANIMATED BRUSH CANVAS */}

        <canvas
          ref={canvasRef}
          className="hero-canvas"
          aria-hidden="true"
        />

        <div className="hero-fallback" />

        {/* JOVIA MUA BRANDING */}

        <div
          className="canvas-overlay canvas-overlay--brand"
          aria-hidden="true"
        >
          <span className="canvas-overlay__byline">
            {settings.company_name.toUpperCase()}
          </span>

          {/* <span className="canvas-overlay__byline">
            BY NAMRATA VIJ
          </span> */}
        </div>

        {/* HERO CONTENT */}

        <div className="hero-copy">
          <p className="eyebrow hero-line">
            {settings.company_name.toUpperCase()} · LUXURY MAKEUP ARTISTRY
          </p>

          <h1 className="hero-title hero-line">
            <span>Beauty Designed</span>
            <span>Around You</span>
          </h1>

          <p className="hero-subline hero-line">
            Modern. Timeless. Luxury.
          </p>

          <p className="hero-description hero-line">
            Creating elevated beauty experiences
            for brides, professionals, and special
            occasions across Delhi and destination
            weddings worldwide.
          </p>

          <div className="hero-actions hero-line">
            <Link
              className="button button--fill"
              to="/contact"
            >
              Book a Consultation
            </Link>

            <a
              className="button button--ghost"
              href="#services"
            >
              Explore Services
            </a>
          </div>
        </div>

        {/* SCROLL INDICATOR */}

        <div
          className="scroll-indicator"
          aria-hidden="true"
        >
          <span />
        </div>
      </div>
    </section>
  );
}