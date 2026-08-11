// Brand mark: the LOVALYA emblem + wordmark, used in every top bar.
export default function Brand({ logoSize = 52, fontSize }) {
  return (
    <span className="brand-wrap">
      <img src="/loverea-logo.svg" alt="LOVALYA" className="brand-logo" style={{ height: logoSize }} />
      <span className="brand" style={fontSize ? { fontSize } : undefined}>LOVALYA</span>
    </span>
  );
}
