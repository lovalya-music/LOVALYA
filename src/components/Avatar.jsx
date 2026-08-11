export default function Avatar({ url, name, size = 32, onClick }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="avatar"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initial
      )}
    </div>
  );
}
