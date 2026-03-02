import { ImageResponse } from 'next/og';

export const alt = 'Mergenix — Genetic Offspring Analysis';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, color: '#14b8a6', marginBottom: 16, display: 'flex' }}>
          Mergenix
        </div>
        <div style={{ fontSize: 32, color: '#94a3b8', display: 'flex' }}>
          Genetic Offspring Analysis Platform
        </div>
        {/* TODO: Update these counts when trait/disease data changes */}
        <div style={{ fontSize: 20, color: '#64748b', marginTop: 24, display: 'flex' }}>
          476 Traits · 2,715 Diseases · Client-Side Privacy
        </div>
      </div>
    ),
    { ...size }
  );
}
