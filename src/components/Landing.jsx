import { useNavigate } from "react-router-dom";
import Brand from "./Brand";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      <header className="landing-top">
        <button
          className="brand-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <Brand logoSize={40} fontSize={22} />
        </button>
        <button className="btn btn-primary" onClick={() => navigate("/app")}>
          Launch app
        </button>
      </header>

      <section className="hero">
        <div className="hero-left">
          <div className="hero-brand">
            <img src="/loverea-logo.svg" className="hero-logo" alt="" />
            <h1 className="hero-title">LOVALYA</h1>
          </div>
          <p className="hero-sub">
            A home for the phonk, hardtekk and angelcore underground, where you
            find collaborators, share sounds, and build your name.
          </p>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={() => navigate("/app")}>
              Enter the board
            </button>
            <button
              className="btn"
              onClick={() => navigate("/app", { state: { view: "artists" } })}
            >
              Browse artists
            </button>
          </div>
        </div>
        <div className="hero-art">
          <img src="/landing.png" className="hero-img" alt="LOVALYA" />
        </div>
      </section>

      <section className="landing-section">
        <div className="eyebrow">What you can do</div>
        <div className="feature-grid">
          <div className="card feature">
            <h3>Collab board</h3>
            <p className="muted">
              Post what you have and who you need, filter by role and genre,
              preview the track, and send a request in one tap.
            </p>
          </div>
          <div className="card feature">
            <h3>Sounds and presets, soon</h3>
            <p className="muted">
              Trade samples and Serum presets, take on bounties, earn credits.
              The next pillar, coming to the hub.
            </p>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="eyebrow">About</div>
        <div className="card">
          <p style={{ margin: 0 }}>
            LOVALYA is built by and for the underground electronic scene, a place
            where producers, vocalists and designers actually find each other
            instead of shouting into the void. Dark, distorted, a little heavenly.
            Made independently, kept free.
          </p>
        </div>
      </section>

      <footer className="landing-foot muted">
        <span>© LOVALYA</span>
        <button className="brand-btn" onClick={() => navigate("/app")}>
          <span className="glow-name" style={{ color: "#ffffff" }}>Enter →</span>
        </button>
      </footer>
    </div>
  );
}
