import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

export type ArtistDetails = {
  section_label: string;
  artist_name: string;
  professional_title: string;
  biography: string;
  photo_url: string | null;
};

const DEFAULT_ARTIST: ArtistDetails = {
  section_label: "THE ARTIST",
  artist_name: "Namrata Vij",
  professional_title: "International Luxury Makeup Artist · Beauty Educator · Entrepreneur",
  biography: "Namrata Vij is an international luxury makeup artist known for creating modern, timeless, and sophisticated beauty experiences. From bridal transformations and destination weddings to editorial campaigns, fashion shows and special events, she creates looks that feel effortlessly elegant and uniquely personal.\n\nHolding an MBA in Marketing from the University of Technology Sydney and founder of Jovia MUA, Namrata brings together artistic excellence and a deep understanding of client experience.",
  photo_url: "/pictures/home-self.png",
};

export default function ArtistSection() {
  const [artist, setArtist] = useState<ArtistDetails>(DEFAULT_ARTIST);

  useEffect(() => {
    let active = true;
    void apiGet<ArtistDetails>("/artist-details")
      .then((data) => { if (active) setArtist(data); })
      .catch((error) => console.error("Unable to load artist details:", error));
    return () => { active = false; };
  }, []);

  return (
    <section className="section about reveal-section is-visible" id="about">
      <div className="about-image reveal-item is-visible">
        <div className="img-placeholder portfolio-card portfolio-card--large">
          {artist.photo_url ? (
            <img src={artist.photo_url} alt={`${artist.artist_name} portrait`} loading="lazy" />
          ) : (
            <div className="artist-empty-portrait" aria-label="Artist portrait unavailable" />
          )}
        </div>
      </div>
      <div className="about-copy reveal-item is-visible">
        <p className="eyebrow">{artist.section_label}</p>
        <h2>{artist.artist_name}</h2>
        <p className="subline">{artist.professional_title}</p>
        {artist.biography.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => (
          <p key={index} style={{ whiteSpace: "pre-line" }}>{paragraph}</p>
        ))}
        <a href="#services" className="text-link">Explore the Artistry →</a>
      </div>
    </section>
  );
}