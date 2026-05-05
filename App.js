import React, { useState } from 'react';
import { useGexWebSocket } from './hooks/useGexWebSocket';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const C = {
  bg: '#060b14', surface: '#0c1422', border: '#1a2844',
  accent: '#00d4ff', green: '#00e676', red: '#ff3d60',
  yellow: '#ffd600', text: '#e0eaff', muted: '#6a85b0'
};

const fmt = (n, d = 2) => n == null ? '—' : Number(n).toFixed(d);

function StatusDot({ status }) {
  const color = { connected: C.green, disconnected: C.red, connecting: C.yellow, error: C.red }[status];
  const label = { connected: 'EN VIVO', disconnected: 'DESCONECTADO', connecting: 'CONECTANDO...', error: 'ERROR' }[status];
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
    </span>
  );
}

function KpiCard({ label, value, sub, color = C.accent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', borderTop: `2px solid ${color}` }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1.5, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function GEXChart({ profile, spot, zeroGamma }) {
  if (!profile?.length) return <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>Cargando datos...</div>;

  const data = profile
    .filter(s => Math.abs(s.strike - spot) / spot < 0.08)
    .sort((a, b) => a.strike - b.strike)
    .map(s => ({ strike: s.strike, call: s.callGEX, put: -s.putGEX, isMajorPos: s.isMajorPositive, isMajorNeg: s.isMajorNegative }));

  const Tooltip2 = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
        <div style={{ color: C.accent, fontWeight: 700, marginBottom: 6 }}>Strike: {label}</div>
        <div style={{ color: C.green }}>Call GEX: {fmt(d?.call, 3)}B</div>
        <div style={{ color: C.red }}>Put GEX: {fmt(Math.abs(d?.put || 0), 3)}B</div>
        {d?.isMajorPos && <div style={{ color: C.accent }}>⭐ Call Wall</div>}
        {d?.isMajorNeg && <div style={{ color: C.yellow }}>⭐ Put Wall</div>}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
        <XAxis dataKey="strike" tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={{ stroke: C.border }} interval={Math.floor(data.length / 8)} />
        <YAxis tick={{ fill: C.muted, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `${v.toFixed(1)}B`} />
        <Tooltip content={<Tooltip2 />} />
        <ReferenceLine y={0} stroke={C.border} />
        <ReferenceLine x={spot} stroke={C.accent} strokeWidth={2} strokeDasharray="4 3" label={{ value: `${spot?.toFixed(1)}`, fill: C.accent, fontSize: 10 }} />
        <ReferenceLine x={Math.round(zeroGamma)} stroke={C.yellow} strokeWidth={1.5} strokeDasharray="6 3" label={{ value: `ZG ${zeroGamma?.toFixed(0)}`, fill: C.yellow, fontSize: 10 }} />
        <Bar dataKey="call" radius={[2, 2, 0, 0]}>
          {data.map((e, i) => <Cell key={i} fill={e.isMajorPos ? C.accent : C.green} opacity={0.85} />)}
        </Bar>
        <Bar dataKey="put" radius={[0, 0, 2, 2]}>
          {data.map((e, i) => <Cell key={i} fill={e.isMajorNeg ? C.yellow : C.red} opacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function App() {
  const { data, status } = useGexWebSocket();
  const [symbol, setSymbol] = useState('SPY');

  const symbols = data?.symbols || ['SPY', 'QQQ', 'SPX'];
  const gex = data?.gexData?.[symbol];
  const quote = data?.quotes?.[symbol];
  const spot = gex?.spot;
  const lastUpdate = data?.lastUpdate ? new Date(data.lastUpdate).toLocaleTimeString('es-MX', { hour12: false }) : null;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'Courier New', monospace" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: ${C.border}; }`}</style>

      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: C.accent }}>GEX</span>
          <span style={{ fontSize: 20, color: C.text }}>BOT</span>
          <div style={{ width: 1, height: 20, background: C.border }} />
          <StatusDot status={status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: C.muted }}>
          {data?.usingRealData && <span style={{ color: C.green }}>🔴 DATOS REALES - ThinkOrSwim</span>}
          <span>👥 {data?.connectedUsers || 0} usuarios</span>
          <span>{data?.isMarketOpen ? <span style={{ color: C.green }}>🟢 Mercado abierto</span> : <span style={{ color: C.red }}>🔴 Mercado cerrado</span>}</span>
          {lastUpdate && <span>⏱ {lastUpdate}</span>}
        </div>
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Symbol selector + quote */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {symbols.map(s => (
              <button key={s} onClick={() => setSymbol(s)} style={{ padding: '7px 18px', borderRadius: 6, border: `1px solid ${s === symbol ? C.accent : C.border}`, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: s === symbol ? 'rgba(0,212,255,0.12)' : 'transparent', color: s === symbol ? C.accent : C.muted, fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>
          {quote && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 30, fontWeight: 800 }}>${fmt(quote.last)}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: parseFloat(quote.change) >= 0 ? C.green : C.red }}>
                {parseFloat(quote.change) >= 0 ? '+' : ''}{fmt(quote.change)} ({fmt(quote.change_percentage)}%)
              </span>
            </div>
          )}
        </div>

        {/* Régimen */}
        {gex && (
          <div style={{ marginBottom: 20 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13, background: gex.regime === 'positive' ? 'rgba(0,230,118,0.12)' : 'rgba(255,61,96,0.12)', border: `1px solid ${gex.regime === 'positive' ? C.green : C.red}`, color: gex.regime === 'positive' ? C.green : C.red }}>
              {gex.regime === 'positive' ? '▲ RÉGIMEN POSITIVO — Mercado estable' : '▼ RÉGIMEN NEGATIVO — Alta volatilidad'}
            </span>
          </div>
        )}

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <KpiCard label="Zero Gamma" value={gex?.zeroGamma?.toFixed(1) || '—'} sub={gex ? (spot > gex.zeroGamma ? '▲ Sobre ZG' : '▼ Bajo ZG') : ''} color={C.yellow} />
          <KpiCard label="Call Wall" value={gex?.majorPositiveGamma?.toFixed(0) || '—'} sub="Resistencia principal" color={C.green} />
          <KpiCard label="Put Wall" value={gex?.majorNegativeGamma?.toFixed(0) || '—'} sub="Soporte principal" color={C.red} />
          <KpiCard label="Net GEX" value={gex ? `${gex.totalNetGEX > 0 ? '+' : ''}${fmt(gex.totalNetGEX)}B` : '—'} sub={gex?.regime === 'positive' ? 'Estabilizador' : 'Amplificador'} color={gex?.totalNetGEX >= 0 ? C.green : C.red} />
          <KpiCard label="GEX Volume" value={gex ? `${fmt(gex.netGEXVolume)}B` : '—'} sub="Flujo intradía" color={C.accent} />
          <KpiCard label="Max Gamma" value={gex?.maxGammaChange?.toFixed(0) || '—'} sub="Strike de mayor cambio" color={C.yellow} />
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>

          {/* Chart */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ marginBottom: 12, fontSize: 12, color: C.muted, display: 'flex', gap: 16 }}>
              <span><span style={{ color: C.accent }}>■</span> Call Wall</span>
              <span><span style={{ color: C.green }}>■</span> Call GEX</span>
              <span><span style={{ color: C.red }}>■</span> Put GEX</span>
              <span><span style={{ color: C.yellow }}>■</span> Put Wall / Zero Gamma</span>
            </div>
            <GEXChart profile={gex?.profile} spot={spot} zeroGamma={gex?.zeroGamma} />
          </div>

          {/* Levels panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Niveles Clave</div>
              {gex && [
                { label: 'Call Wall 1', val: gex.top3Calls?.[0], color: C.green },
                { label: 'Call Wall 2', val: gex.top3Calls?.[1], color: 'rgba(0,230,118,0.6)' },
                { label: 'Call Wall 3', val: gex.top3Calls?.[2], color: 'rgba(0,230,118,0.4)' },
                { label: '── Spot ──', val: spot, color: C.accent, bold: true },
                { label: '── Zero Gamma ──', val: gex.zeroGamma, color: C.yellow, bold: true },
                { label: 'Put Wall 1', val: gex.top3Puts?.[0], color: C.red },
                { label: 'Put Wall 2', val: gex.top3Puts?.[1], color: 'rgba(255,61,96,0.6)' },
                { label: 'Put Wall 3', val: gex.top3Puts?.[2], color: 'rgba(255,61,96,0.4)' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, borderLeft: item.bold ? `3px solid ${item.color}` : 'none', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: item.color }}>{item.label}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: item.color }}>{item.val ? item.val.toFixed(1) : '—'}</span>
                </div>
              ))}
            </div>

            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Interpretación</div>
              {gex && (
                <div style={{ fontSize: 12, lineHeight: 1.6, color: C.muted }}>
                  <div style={{ padding: 10, borderRadius: 8, background: gex.regime === 'positive' ? 'rgba(0,230,118,0.08)' : 'rgba(255,61,96,0.08)', color: gex.regime === 'positive' ? C.green : C.red, marginBottom: 10 }}>
                    {gex.regime === 'positive' ? '✅ Dealers amortiguan movimientos. Favorece rangos y mean-reversion.' : '⚠️ Dealers amplifican movimientos. Favorece momentum y tendencias.'}
                  </div>
                  {spot > gex.zeroGamma
                    ? <span><span style={{ color: C.green }}>▲</span> Spot sobre Zero Gamma → régimen estable</span>
                    : <span><span style={{ color: C.red }}>▼</span> Spot bajo Zero Gamma → mayor volatilidad</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
