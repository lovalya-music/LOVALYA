import { useNavigate } from "react-router-dom";
import AudioPlayer from "./AudioPlayer";
import Avatar from "./Avatar";
import { formatDateTime } from "../lib/format";

// Read-only post display, used on the post page and the profile carousel.
export default function PostView({ post, linkTitle = true }) {
  const navigate = useNavigate();
  const a = post.author || {};

  return (
    <div className="card post">
      <div className="post-head">
        <button className="post-author" onClick={() => navigate("/u/" + post.author_id)}>
          <Avatar url={a.avatar_url} name={a.username} size={30} />
          <span className="post-author-name">{a.username}</span>
        </button>
        <span className="post-date">{formatDateTime(post.created_at)}</span>
      </div>

      <h3
        className="post-title"
        style={linkTitle ? { cursor: "pointer" } : undefined}
        onClick={linkTitle ? () => navigate("/p/" + post.id) : undefined}
      >
        {post.title}
      </h3>

      <div className="post-meta">
        {post.looking_for?.length > 0 && (
          <div className="post-meta-block">
            <div className="post-meta-label">Looking for</div>
            <div className="chips">
              {post.looking_for.map((r) => (
                <span key={r} className="tag accent">{r}</span>
              ))}
            </div>
          </div>
        )}
        {post.offering && (
          <div className="post-meta-block">
            <div className="post-meta-label">Offers</div>
            <div className="post-meta-value">{post.offering}</div>
          </div>
        )}
      </div>

      {post.description && <p className="post-desc">{post.description}</p>}

      {post.genres?.length > 0 && (
        <div className="chips">
          {post.genres.map((g) => (
            <span key={g} className="chip static">{g}</span>
          ))}
        </div>
      )}

      {post.preview_url && <AudioPlayer src={post.preview_url} />}
    </div>
  );
}
