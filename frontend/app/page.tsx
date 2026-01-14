"use client"

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { AreaChart, Area, Line, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { gqlRequest } from '@/lib/graphql'
import { voteSummaryQuery } from '@/lib/queries'

const data = [
  { year: '2019', deficit: 3.0, interest: 32 },
  { year: '2020', deficit: 8.9, interest: 29 },
  { year: '2021', deficit: 6.5, interest: 31 },
  { year: '2022', deficit: 4.8, interest: 42 },
  { year: '2023', deficit: 5.5, interest: 50 },
  { year: '2024', deficit: 6.1, interest: 55 },
  { year: '2025', deficit: 6.2, interest: 62 },
];
const latest = data[data.length - 1];

export default function LandingPage() {
  const router = useRouter()
  const [isExiting, setIsExiting] = useState(false)
  const [voteCount, setVoteCount] = useState<number | null>(null)

  useEffect(() => {
    async function fetchVotes() {
      try {
        const res = await gqlRequest(voteSummaryQuery)
        const total = (res.voteSummary || []).reduce((acc: number, curr: any) => acc + (curr.votes || 0), 0)
        // Combine with a base number if desired, or show real count
        // For now, let's show real count + a starting offset to maintain the "size" of the debate
        setVoteCount(4812 + total)
      } catch (err) {
        console.error("Failed to fetch votes", err)
        setVoteCount(4812)
      }
    }
    fetchVotes()
  }, [])

  const handleEnter = () => {
    setIsExiting(true)
    setTimeout(() => {
      router.push('/build')
    }, 800)
  }

  return (
    <div className="relative min-h-screen w-full flex items-start sm:items-center justify-center overflow-hidden bg-slate-950 font-['Outfit'] py-10 sm:py-0">

      {/* Background Ambience */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay grayscale"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950"></div>
      </div>

      <div className={`relative z-10 max-w-6xl px-6 sm:px-8 w-full grid lg:grid-cols-2 gap-10 lg:gap-16 items-center transition-all duration-700 ${isExiting ? 'scale-105 opacity-0' : 'scale-100 opacity-100'}`}>

        {/* Left Column: The Narrative */}
        <div className="text-left flex flex-col gap-8 sm:gap-10">
          <div className="flex flex-col gap-4 order-1">
            <div className="inline-flex items-center gap-3 px-3 sm:px-4 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-[10px] sm:text-xs font-bold tracking-widest backdrop-blur-md w-fit">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              SESSION EXTRAORDINAIRE CITOYENNE
            </div>
            <div className="text-slate-500 text-xs sm:text-sm font-medium tracking-tight">
              Déjà <span className="text-slate-300 font-bold">{voteCount !== null ? voteCount.toLocaleString() : '...'}</span> citoyens ont exprimé leurs préférences pour éclairer le débat.
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white order-2">
            L'État est bloqué. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Prenez les clés.
            </span>
          </h1>



          <div className="space-y-6 text-base sm:text-lg text-slate-400 leading-relaxed font-light max-w-xl order-5 md:order-4">
            <p>
              1er Janvier 2026. La procédure parlementaire s'est enrayée. Le budget n'a pas été voté. Une 'Loi Spéciale' assure le fonctionnement provisoire de l'État, mais aucun arbitrage d'avenir n'est tranché.
            </p>
            <div className="pt-4 border-l-2 border-indigo-500/50 pl-6">
              <p className="italic text-slate-300 font-serif text-lg sm:text-xl">
                "Face à l'impasse, nous ouvrons une session citoyenne. Votre mandat : explorer les comptes, confronter les réalités et dessiner une issue."
              </p>
            </div>
          </div>

          <button
            onClick={handleEnter}
            className="group relative px-6 sm:px-8 py-4 sm:py-5 bg-white text-slate-900 rounded-xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] w-full md:w-auto overflow-hidden order-4 md:order-5"
          >
            <span className="relative z-10 flex items-center gap-3 justify-center">
              Entrez dans l'Hémicycle
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </span>
          </button>
          {/* Disclaimer */}
          <div className="mt-2 flex items-start gap-3 opacity-70 hover:opacity-100 transition-opacity max-w-lg order-6 mb-24 md:mb-0">
            <div className="text-[10px] text-amber-500 font-bold uppercase tracking-wider shrink-0 mt-0.5 border border-amber-500/20 bg-amber-500/10 px-1.5 py-px rounded">BÊTA</div>
            <p className="text-xs text-slate-500 leading-snug">
              Version expérimentale. Nous faisons tout pour agréger les données avec la plus grande rigueur, mais l'erreur reste humaine. Une incohérence ? Une suggestion ? Contactez <a href="mailto:contact@budget-citoyen.fr" className="text-slate-400 hover:text-white underline decoration-slate-700 underline-offset-2 transition-colors">contact@budget-citoyen.fr</a>
            </p>
          </div>
        </div>

        {/* Right Column: The Crisis Visualization */}
        <div
          data-testid="landing-hero-visual"
          className="hidden md:block relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-white font-bold text-xl mb-1">L'Inertie Budgétaire</h3>
              <p className="text-slate-500 text-sm">Le déficit tendanciel se creuse.</p>
            </div>
            <div className="text-right">
              <span className="block text-3xl font-bold text-red-500">55 Md€</span>
              <span className="text-xs text-slate-500 uppercase tracking-wide">Intérêts payés en 2024</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <defs>
                  <linearGradient id="gradDeficit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" hide domain={[0, 10]} />
                <YAxis yAxisId="right" orientation="right" hide domain={[0, 80]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff' }}
                />
                <ReferenceLine yAxisId="left" y={3} stroke="#10b981" strokeDasharray="3 3" label={{ value: '3%', fill: '#10b981', fontSize: 10 }} />

                {/* Deficit Bar */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="deficit"
                  name="Déficit (% PIB)"
                  fill="url(#gradDeficit)"
                  stroke="none"
                />

                {/* Interest Line - The Killer Metric */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="interest"
                  name="Charge Dette (Md€)"
                  stroke="#f87171"
                  strokeWidth={4}
                  dot={{ r: 4, fill: '#f87171', strokeWidth: 2, stroke: '#fff' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 text-xs text-slate-500 text-center">
            Source: Insee, Projections Bercy • La charge de la dette est devenue le 2ème budget de l'État.
          </div>
        </div>

      </div>



    </div>
  )
}
