'use client'
import Link from "next/link";
import React, { useEffect, useState } from "react";

// Monochrome color palette
const C = {
  bg: '#0a0a0a',
  bgCard: '#141414',
  border: '#222',
  borderHover: '#333',
  text: '#999',
  textBright: '#fff',
  textMuted: '#666',
};

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      position: 'relative' as const,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    },
    bgGlow: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(ellipse at 20% 80%, rgba(255,255,255,0.02) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.015) 0%, transparent 50%)
      `,
      pointerEvents: 'none' as const,
    },
    content: {
      position: 'relative' as const,
      zIndex: 1,
      textAlign: 'center' as const,
    },
    title: {
      fontSize: 72,
      fontWeight: 200,
      letterSpacing: 24,
      color: C.textBright,
      margin: '0 0 12px 0',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.8s ease',
    },
    subtitle: {
      fontSize: 13,
      letterSpacing: 6,
      color: C.textMuted,
      textTransform: 'uppercase' as const,
      marginBottom: 60,
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.8s ease 0.15s',
    },
    btn: {
      display: 'inline-block',
      padding: '16px 48px',
      fontSize: 14,
      fontWeight: 500,
      letterSpacing: 2,
      color: C.bg,
      background: C.textBright,
      border: 'none',
      borderRadius: 0,
      textDecoration: 'none',
      cursor: 'pointer',
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.3s ease, opacity 0.8s ease 0.3s, transform 0.8s ease 0.3s',
    },
    version: {
      position: 'absolute' as const,
      bottom: 24,
      fontSize: 11,
      letterSpacing: 2,
      color: C.border,
      textTransform: 'uppercase' as const,
    },
    decoLine: (top: boolean) => ({
      position: 'absolute' as const,
      left: '20%',
      right: '20%',
      height: 1,
      background: `linear-gradient(90deg, transparent, ${C.border}, transparent)`,
      top: top ? '30%' : undefined,
      bottom: top ? undefined : '30%',
    }),
    corner: (pos: string) => {
      const base = {
        position: 'absolute' as const,
        width: 60,
        height: 60,
        border: `1px solid ${C.border}`,
      };
      if (pos === 'tl') return { ...base, top: 40, left: 40, borderRight: 'none', borderBottom: 'none' };
      if (pos === 'tr') return { ...base, top: 40, right: 40, borderLeft: 'none', borderBottom: 'none' };
      if (pos === 'bl') return { ...base, bottom: 40, left: 40, borderRight: 'none', borderTop: 'none' };
      return { ...base, bottom: 40, right: 40, borderLeft: 'none', borderTop: 'none' };
    },
  };

  return (
    <main style={styles.container}>
      <div style={styles.bgGlow} />
      
      <div style={styles.decoLine(true)} />
      <div style={styles.decoLine(false)} />
      
      <div style={styles.corner('tl')} />
      <div style={styles.corner('tr')} />
      <div style={styles.corner('bl')} />
      <div style={styles.corner('br')} />

      <div style={styles.content}>
        <h1 style={styles.title}>ANIMORPH</h1>
        <p style={styles.subtitle}>AI & Human Perception Project</p>
        
        <Link 
          href="/examples/p_test" 
          style={styles.btn}
          onMouseEnter={e => {
            e.currentTarget.style.background = C.bg;
            e.currentTarget.style.color = C.textBright;
            e.currentTarget.style.boxShadow = `inset 0 0 0 1px ${C.textBright}`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = C.textBright;
            e.currentTarget.style.color = C.bg;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          ENTER EXPERIENCE
        </Link>
      </div>

      <span style={styles.version}>Interactive Installation v1.0</span>
    </main>
  );
}
