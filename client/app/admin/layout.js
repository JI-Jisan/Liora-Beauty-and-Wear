
export const metadata = {
  title: "Admin Panel | LIORA Beauty & Wear",
  description: "LIORA Beauty & Wear Admin Management Dashboard",
  robots: "noindex, nofollow",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-root" style={{ minHeight: "100vh", background: "#faf7f5", width: "100%", overflowX: "hidden" }}>
      {children}
    </div>
  );
}
