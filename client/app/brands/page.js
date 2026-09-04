import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { Brand } from "@/lib/models";
import Header from "@/components/Header";

export const revalidate = 60; // optionally revalidate every minute

export default async function BrandsPage() {
  await connectToDatabase();
  const brands = await Brand.find({ isActive: true })
    .sort({ order: 1, name: 1 })
    .lean();

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24, fontSize: 24, color: '#0f172a' }}>All Brands</h1>
        
        {brands.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b' }}>No brands available at the moment.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
            gap: 16 
          }}>
            {brands.map(b => (
              <Link key={b._id} href={`/brands/${b.slug}`} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                padding: '16px 12px', border: '1px solid #f1f5f9', borderRadius: 14,
                textDecoration: 'none', color: '#1e293b', background: '#fff',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)', transition: 'all 0.2s ease',
              }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  padding: 6,
                }}>
                  {b.logo ? (
                    <img 
                      src={b.logo.includes('/upload/') ? b.logo.replace('/upload/', '/upload/f_auto,q_auto,w_200/') : b.logo}
                      alt={b.name} 
                      width={64} 
                      height={64}
                      style={{ objectFit: 'contain', width: '100%', height: '100%' }} 
                    />
                  ) : (
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#64748b' }}>
                      {b.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: '#0f172a' }}>{b.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
