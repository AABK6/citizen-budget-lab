import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Citizen Budget Lab</h1>
        <small>API: {process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:8000/graphql'}</small>
        <nav style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          <a href="/">Home</a>
          <a href="/explore">Explore €1</a>
          <a href="/procurement">Procurement</a>
          <a href="/what-if">What‑if</a>
        </nav>
      </header>
      <Component {...pageProps} />
    </main>
  );
}

