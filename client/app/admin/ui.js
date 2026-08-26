export const T = {
  border: '1px solid #eceff3',
  radius: 14,
  shadow: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
  brand: '#e11d63',
  text: '#0f172a',
  muted: '#667085',
  bg: '#f7f8fa'
};

export function Card({ title, desc, children }) {
  return (
    <section style={{
      background: '#fff', border: T.border, borderRadius: T.radius,
      boxShadow: T.shadow, padding: 18, marginBottom: 16
    }}>
      {title && (
        <header style={{ marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: T.text }}>{title}</h3>
          {desc && <p style={{ margin: '4px 0 0', fontSize: 12.5, color: T.muted }}>{desc}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, required, children }) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600,
                     color: T.text, marginBottom: 6 }}>
        {label} {required && <span style={{ color: T.brand }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ display: 'block', fontSize: 11.5, color: T.muted,
                              marginTop: 5 }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = {
  width: '100%', minWidth: 0, boxSizing: 'border-box',
  padding: '11px 12px', fontSize: 14, color: T.text,
  border: '1px solid #dfe3e8', borderRadius: 10,
  outline: 'none', background: '#fff', transition: 'border-color .15s, box-shadow .15s'
};
