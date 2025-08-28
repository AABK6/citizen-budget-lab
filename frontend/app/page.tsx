import Link from 'next/link'

export default function Home() {
  return (
    <div className="stack">
      <h2>Welcome</h2>
      <p>Select a section to get started:</p>
      <ul>
        <li><Link href="/explore">Explore €1</Link></li>
        <li><Link href="/procurement">Who gets paid?</Link></li>
        <li><Link href="/what-if">What‑if scenarios</Link></li>
        <li><Link href="/compare-eu">Compare EU</Link></li>
        <li><Link href="/sources">Sources</Link></li>
      </ul>
    </div>
  )
}

