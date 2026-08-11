import { useEffect, useState, useCallback, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Auth from "./components/Auth";
import SetNewPassword from "./components/SetNewPassword";
import ProfilePanel from "./components/ProfilePanel";
import Board from "./components/Board";
import CreatePost from "./components/CreatePost";
import Requests from "./components/Requests";
import Settings from "./components/Settings";
import PublicProfile from "./components/PublicProfile";
import PostPage from "./components/PostPage";
import Landing from "./components/Landing";
import ArtistsTable from "./components/ArtistsTable";
import NotificationsBell from "./components/NotificationsBell";
import Brand from "./components/Brand";

function BgFx() {
  return (
    <div className="bg-fx" aria-hidden="true">
      <span className="b1" />
      <span className="b2" />
      <span className="b3" />
    </div>
  );
}

// Soft glow that follows the cursor — lives on the background, so cards sit
// in front of it and it only shimmers through their translucency.
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const el = ref.current;
      if (el) el.style.transform = `translate3d(${x - 140}px, ${y - 140}px, 0)`;
    };
    const move = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener("mousemove", move);
    return () => {
      window.removeEventListener("mousemove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="cursor-glow" ref={ref} aria-hidden="true">
      <i />
    </div>
  );
}

function DiscordCorner() {
  return (
    <a
      className="discord-corner"
      href="https://discord.gg/TD3td8AKt6"
      target="_blank"
      rel="noreferrer"
      aria-label="Join our Discord"
    >
      <span className="discord-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 365.467" fill="currentColor">
          <path d="M378.186 365.028s-15.794-18.865-28.956-35.099c57.473-16.232 79.41-51.77 79.41-51.77-17.989 11.846-35.099 20.182-50.454 25.885-21.938 9.213-42.997 14.917-63.617 18.866-42.118 7.898-80.726 5.703-113.631-.438-25.008-4.827-46.506-11.407-64.494-18.867-10.091-3.947-21.059-8.774-32.027-14.917-1.316-.877-2.633-1.316-3.948-2.193-.877-.438-1.316-.878-1.755-.878-7.898-4.388-12.285-7.458-12.285-7.458s21.06 34.659 76.779 51.331c-13.163 16.673-29.395 35.977-29.395 35.977C36.854 362.395 0 299.218 0 299.218 0 159.263 63.177 45.633 63.177 45.633 126.354-1.311 186.022.005 186.022.005l4.388 5.264C111.439 27.645 75.461 62.305 75.461 62.305s9.653-5.265 25.886-12.285c46.945-20.621 84.236-25.885 99.592-27.64 2.633-.439 4.827-.878 7.458-.878 26.763-3.51 57.036-4.387 88.624-.878 41.68 4.826 86.43 17.111 132.058 41.68 0 0-34.66-32.906-109.244-55.281l6.143-7.019s60.105-1.317 122.844 45.628c0 0 63.178 113.631 63.178 253.585 0-.438-36.854 62.739-133.813 65.81l-.001.001zm-43.874-203.133c-25.006 0-44.75 21.498-44.75 48.262 0 26.763 20.182 48.26 44.75 48.26 25.008 0 44.752-21.497 44.752-48.26 0-26.764-20.182-48.262-44.752-48.262zm-160.135 0c-25.008 0-44.751 21.498-44.751 48.262 0 26.763 20.182 48.26 44.751 48.26 25.007 0 44.75-21.497 44.75-48.26.439-26.763-19.742-48.262-44.75-48.262z" />
        </svg>
      </span>
      <span className="discord-label">Join our Discord</span>
    </a>
  );
}

// One-time entrance: blackscreen, logo appears, slides left, wordmark slides out.
function Intro({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(onDone, 3150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);
  return (
    <div className={"intro" + (leaving ? " leaving" : "")}>
      <div className="intro-mark">
        <img src="/loverea-logo.svg" className="intro-logo" alt="" />
        <span className="intro-word">LOVALYA</span>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);
  const [recovery, setRecovery] = useState(false);
  const [showIntro, setShowIntro] = useState(() => {
    try {
      return sessionStorage.getItem("introSeen") !== "1";
    } catch {
      return true;
    }
  });
  const location = useLocation();
  const introKeyRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Replay the intro when entering the app from the landing (state.intro).
  useEffect(() => {
    if (
      location.pathname === "/app" &&
      location.state?.intro &&
      location.key !== introKeyRef.current
    ) {
      introKeyRef.current = location.key;
      setShowIntro(true);
    }
  }, [location]);

  function endIntro() {
    try {
      sessionStorage.setItem("introSeen", "1");
    } catch {
      // ignore
    }
    setShowIntro(false);
  }

  return (
    <>
      <BgFx />
      <CursorGlow />
      <div className="top-scrim" aria-hidden="true" />
      <DiscordCorner />
      {showIntro && <Intro onDone={endIntro} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<MainGate session={session} recovery={recovery} setRecovery={setRecovery} />} />
        <Route path="/u/:userId" element={<PublicProfilePage session={session} />} />
        <Route path="/p/:postId" element={<PostPage session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function PublicProfilePage({ session }) {
  return (
    <div className="app">
      <div className="topbar">
        <Link to="/" className="brand-link">
          <Brand />
        </Link>
        {!session && <Link to="/app" className="tab">Sign in</Link>}
      </div>
      <PublicProfile hasSession={!!session} />
    </div>
  );
}

function MainGate({ session, recovery, setRecovery }) {
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    setProfileLoaded(false);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setProfileLoaded(true);
      });
  }, [userId]);

  if (session === undefined) return null;
  if (recovery) return <SetNewPassword onDone={() => setRecovery(false)} />;
  if (!session) return <Auth />;
  if (!profileLoaded) return null;

  if (!profile) {
    return (
      <div className="app">
        <div className="topbar">
          <Link to="/" className="brand-link"><Brand /></Link>
          <button className="tab" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
        <ProfilePanel
          userId={userId}
          authUser={session.user}
          existingProfile={null}
          onSaved={setProfile}
        />
      </div>
    );
  }

  return (
    <MainApp userId={userId} authUser={session.user} profile={profile} setProfile={setProfile} />
  );
}

function MainApp({ userId, authUser, profile, setProfile }) {
  const location = useLocation();
  const [view, setView] = useState(location.state?.view || "board");
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();

  const refreshPending = useCallback(async () => {
    const { data } = await supabase
      .from("collab_requests")
      .select("id, status, post:collab_posts!collab_requests_post_id_fkey(author_id)")
      .eq("status", "pending");
    const count = (data || []).filter((r) => r.post?.author_id === userId).length;
    setPendingCount(count);
  }, [userId]);

  useEffect(() => {
    refreshPending();
  }, [refreshPending]);

  const Tab = ({ id, children }) => (
    <button className={"tab" + (view === id ? " active" : "")} onClick={() => setView(id)}>
      {children}
      {id === "requests" && pendingCount > 0 && <span className="dot" />}
    </button>
  );

  return (
    <div className="app">
      <div className="topbar">
        <button className="brand-btn" onClick={() => navigate("/")}>
          <Brand />
        </button>
        <div className="row" style={{ gap: 6 }}>
          <div className="tabs">
            <Tab id="board">Board</Tab>
            <Tab id="new">New post</Tab>
            <Tab id="artists">Artists</Tab>
            <Tab id="requests">Requests</Tab>
            <Tab id="profile">Profile</Tab>
          </div>
          <NotificationsBell userId={userId} />
          <button className="bell-btn" onClick={() => setView("settings")} aria-label="Settings" title="Settings">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          <button className="tab" onClick={() => supabase.auth.signOut()}>Log out</button>
        </div>
      </div>

      {view === "board" && <Board userId={userId} />}
      {view === "new" && <CreatePost userId={userId} onCreated={() => setView("board")} />}
      {view === "artists" && <ArtistsTable />}
      {view === "requests" && <Requests userId={userId} onChange={refreshPending} />}
      {view === "profile" && (
        <PublicProfile userId={userId} isSelf hasSession onEdit={() => setView("settings")} />
      )}
      {view === "settings" && (
        <Settings
          userId={userId}
          authUser={authUser}
          profile={profile}
          onSaved={setProfile}
          onBack={() => setView("profile")}
        />
      )}
    </div>
  );
}
