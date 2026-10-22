import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Speak Easy — American English Coach',
    short_name: 'Speak Easy',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ef',
    theme_color: '#1a8fd1',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
