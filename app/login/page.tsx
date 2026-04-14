"use client";

import { useState, FormEvent, useEffect, useRef } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focused, setFocused] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Starfield + bokeh particles
  useEffect(() => {
    setMounted(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    interface Star { x: number; y: number; r: number; o: number; twinkle: number; speed: number; }
    interface Bokeh { x: number; y: number; r: number; o: number; vx: number; vy: number; color: string; }

    let stars: Star[] = [];
    let bokehs: Bokeh[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const initParticles = () => {
      stars = [];
      bokehs = [];
      const w = canvas.width;
      const h = canvas.height;

      // Stars
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.3,
          o: Math.random() * 0.8 + 0.2,
          twinkle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005,
        });
      }

      // Bokeh blurs
      const bokehColors = [
        "rgba(0,200,200,", "rgba(100,140,255,", "rgba(200,160,255,",
        "rgba(80,220,180,", "rgba(255,200,150,", "rgba(150,100,255,",
      ];
      for (let i = 0; i < 15; i++) {
        bokehs.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 60 + 30,
          o: Math.random() * 0.12 + 0.03,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          color: bokehColors[Math.floor(Math.random() * bokehColors.length)],
        });
      }
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const draw = () => {
      time += 0.016;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Twinkling stars
      stars.forEach((s) => {
        const flicker = Math.sin(time * 60 * s.speed + s.twinkle) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,220,255,${s.o * flicker})`;
        ctx.fill();
      });

      // Floating bokeh
      bokehs.forEach((b) => {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, b.color + (b.o + 0.05) + ")");
        grad.addColorStop(0.5, b.color + b.o * 0.5 + ")");
        grad.addColorStop(1, b.color + "0)");
        ctx.fillStyle = grad;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r) b.x = w + b.r;
        if (b.x > w + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = h + b.r;
        if (b.y > h + b.r) b.y = -b.r;
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        setError(data.error || "Authentication failed");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div style={s.page}>
      {/* Space background layers */}
      <div style={s.nebulaBg} />
      <canvas ref={canvasRef} style={s.canvas} />

      {/* Glass card */}
      <div className={`login-card ${shake ? "shake" : ""} ${success ? "success-out" : ""}`} style={s.card}>
        {/* Top glow edge */}
        <div style={s.topGlow} />
        {/* Side glow edges */}
        <div style={s.leftGlow} />
        <div style={s.rightGlow} />

        {/* Lock icon with concentric rings */}
        <div style={s.lockSection}>
          <div className="ring ring1" />
          <div className="ring ring2" />
          <div className="ring ring3" />
          <div style={s.lockCircle}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="lockGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="url(#lockGrad)" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="url(#lockGrad)" />
              <circle cx="12" cy="16" r="1" fill="#22d3ee" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 style={s.title}>Welcome Back</h1>
        <p style={s.subtitle}>Enter your credentials to access the dashboard</p>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.dividerLine} />
          <span style={s.dividerText}>AUTHENTICATE</span>
          <div style={s.dividerLine} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={s.form}>
          <label style={s.label}>Password</label>

          {/* Input with ring effect */}
          <div style={s.inputOuter}>
            {focused && (
              <>
                <div className="input-ring input-ring1" />
                <div className="input-ring input-ring2" />
              </>
            )}
            <div style={{
              ...s.inputWrap,
              borderColor: error ? "rgba(239,68,68,0.6)" : focused ? "rgba(34,211,238,0.6)" : "rgba(148,163,184,0.12)",
              boxShadow: error
                ? "0 0 20px rgba(239,68,68,0.15), inset 0 1px 0 rgba(255,255,255,0.03)"
                : focused
                  ? "0 0 25px rgba(34,211,238,0.15), 0 0 60px rgba(34,211,238,0.05), inset 0 1px 0 rgba(255,255,255,0.03)"
                  : "inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(34,211,238,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Enter your password"
                style={s.input}
                autoFocus
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={s.eyeBtn} tabIndex={-1}>
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error / Validating */}
          <div style={{ minHeight: 22, marginTop: 6 }}>
            {error ? (
              <div className="error-msg" style={s.errorRow}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                <span style={s.errorText}>{error}</span>
              </div>
            ) : loading ? (
              <div style={s.validatingRow}>
                <div className="dot-pulse" />
                <span style={s.validatingText}>Validating...</span>
              </div>
            ) : null}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || !password} className="submit-btn" style={{
            ...s.submitBtn,
            opacity: loading || !password ? 0.55 : 1,
            cursor: loading || !password ? "not-allowed" : "pointer",
          }}>
            {success ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span>Unlock Dashboard</span>
                {loading && <div className="btn-spinner" />}
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div style={s.footer}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.5}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Protected by JWT · IJF Attendance System</span>
        </div>
      </div>

      {/* Corner sparkle */}
      <div className="sparkle" style={s.sparkle}>✦</div>

      <style>{`
        @keyframes cardEntry {
          0% { opacity: 0; transform: translateY(50px) scale(0.92); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes shakeAnim {
          0%, 100% { transform: translateX(0); }
          15%, 55%, 85% { transform: translateX(-8px); }
          35%, 75% { transform: translateX(8px); }
        }
        @keyframes successOut {
          0% { transform: scale(1); opacity: 1; filter: blur(0); }
          100% { transform: scale(1.05); opacity: 0; filter: blur(12px); }
        }
        @keyframes ringPulse {
          0% { transform: translate(-50%,-50%) scale(0.8); opacity: 0.5; }
          100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }
        @keyframes shimmerEdge {
          0% { opacity: 0.3; }
          50% { opacity: 0.7; }
          100% { opacity: 0.3; }
        }
        @keyframes inputRingPulse {
          0% { transform: scale(1); opacity: 0.3; }
          100% { transform: scale(1.15); opacity: 0; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes sparkleFloat {
          0%, 100% { transform: rotate(0deg) scale(1); opacity: 0.3; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 0.6; }
        }
        @keyframes dotPulseAnim {
          0%, 80%, 100% { opacity: 0.3; }
          40% { opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .login-card {
          animation: cardEntry 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-card.shake {
          animation: shakeAnim 0.5s ease-in-out !important;
        }
        .login-card.success-out {
          animation: successOut 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
        }

        /* Concentric lock rings */
        .ring {
          position: absolute;
          top: 50%; left: 50%;
          border-radius: 50%;
          border: 1px solid rgba(34,211,238,0.15);
          animation: ringPulse 3s ease-out infinite;
          pointer-events: none;
        }
        .ring1 { width: 100px; height: 100px; animation-delay: 0s; }
        .ring2 { width: 140px; height: 140px; animation-delay: 1s; }
        .ring3 { width: 180px; height: 180px; animation-delay: 2s; }

        /* Input rings */
        .input-ring {
          position: absolute;
          inset: -8px;
          border-radius: 20px;
          border: 1px solid rgba(34,211,238,0.12);
          animation: inputRingPulse 2s ease-out infinite;
          pointer-events: none;
        }
        .input-ring1 { animation-delay: 0s; }
        .input-ring2 { inset: -16px; border-radius: 26px; animation-delay: 0.8s; }

        .error-msg { animation: fadeSlideUp 0.3s ease; }

        .submit-btn {
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
          background-size: 200% 200% !important;
          animation: gradientShift 5s ease infinite !important;
        }
        .submit-btn:not(:disabled):hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 35px rgba(99,102,241,0.4), 0 0 80px rgba(99,102,241,0.1) !important;
          filter: brightness(1.1);
        }
        .submit-btn:not(:disabled):active {
          transform: translateY(0) scale(0.98) !important;
        }

        .btn-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .dot-pulse {
          width: 6px; height: 6px;
          background: rgba(34,211,238,0.6);
          border-radius: 50%;
          animation: dotPulseAnim 1.2s ease-in-out infinite;
        }

        .sparkle {
          animation: sparkleFloat 6s ease-in-out infinite;
        }

        input::placeholder { color: rgba(148,163,184,0.3); }
        input:focus { outline: none; }

        @media (max-width: 500px) {
          .login-card { margin: 16px !important; padding: 36px 22px !important; }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#030712",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
  },

  // Nebula / space background
  nebulaBg: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    background: `
      radial-gradient(ellipse 80% 60% at 20% 40%, rgba(30,58,138,0.3) 0%, transparent 50%),
      radial-gradient(ellipse 60% 50% at 75% 30%, rgba(88,28,135,0.25) 0%, transparent 50%),
      radial-gradient(ellipse 50% 40% at 50% 70%, rgba(6,95,70,0.15) 0%, transparent 50%),
      radial-gradient(ellipse 40% 30% at 85% 75%, rgba(30,64,175,0.2) 0%, transparent 50%),
      radial-gradient(ellipse 70% 50% at 10% 80%, rgba(91,33,182,0.15) 0%, transparent 50%)
    `,
    pointerEvents: "none",
  },

  canvas: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },

  // Card
  card: {
    position: "relative",
    zIndex: 10,
    background: "linear-gradient(165deg, rgba(15,23,42,0.65) 0%, rgba(8,12,25,0.8) 100%)",
    border: "1px solid rgba(34,211,238,0.1)",
    borderRadius: 24,
    padding: "44px 40px",
    width: "100%",
    maxWidth: 400,
    textAlign: "center" as const,
    backdropFilter: "blur(40px) saturate(1.4)",
    WebkitBackdropFilter: "blur(40px) saturate(1.4)",
    boxShadow: `
      0 40px 80px rgba(0,0,0,0.5),
      0 0 0 1px rgba(34,211,238,0.06),
      inset 0 1px 0 rgba(255,255,255,0.04),
      inset 0 -1px 0 rgba(0,0,0,0.2)
    `,
  },

  // Glow edges
  topGlow: {
    position: "absolute" as const,
    top: -1,
    left: "20%",
    right: "20%",
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.5), rgba(167,139,250,0.3), transparent)",
    borderRadius: 1,
    animation: "shimmerEdge 3s ease-in-out infinite",
  },
  leftGlow: {
    position: "absolute" as const,
    top: "20%",
    bottom: "20%",
    left: -1,
    width: 1,
    background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.2), transparent)",
    borderRadius: 1,
    animation: "shimmerEdge 4s ease-in-out infinite",
  },
  rightGlow: {
    position: "absolute" as const,
    top: "20%",
    bottom: "20%",
    right: -1,
    width: 1,
    background: "linear-gradient(180deg, transparent, rgba(167,139,250,0.2), transparent)",
    borderRadius: 1,
    animation: "shimmerEdge 4s ease-in-out infinite 1s",
  },

  // Lock section with rings
  lockSection: {
    position: "relative" as const,
    width: 90,
    height: 90,
    margin: "0 auto 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  lockCircle: {
    position: "relative" as const,
    zIndex: 2,
    width: 76,
    height: 76,
    borderRadius: "50%",
    background: "linear-gradient(145deg, rgba(34,211,238,0.08) 0%, rgba(6,182,212,0.04) 100%)",
    border: "1px solid rgba(34,211,238,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 40px rgba(34,211,238,0.1), inset 0 0 20px rgba(34,211,238,0.03)",
  },

  // Title
  title: {
    fontSize: 26,
    fontWeight: 700,
    background: "linear-gradient(135deg, #e2e8f0 0%, #22d3ee 60%, #a78bfa 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: 8,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: 400,
    lineHeight: 1.5,
  },

  // Divider
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    margin: "26px 0 22px",
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.12), transparent)",
  },
  dividerText: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "3px",
    color: "rgba(34,211,238,0.4)",
  },

  // Form
  form: {
    display: "flex",
    flexDirection: "column" as const,
    textAlign: "left" as const,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
    marginBottom: 8,
    letterSpacing: "0.5px",
    textTransform: "uppercase" as const,
  },

  // Input with outer ring container
  inputOuter: {
    position: "relative" as const,
  },
  inputWrap: {
    position: "relative" as const,
    zIndex: 2,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "0 14px",
    height: 50,
    borderRadius: 14,
    background: "rgba(0,0,0,0.35)",
    border: "1.5px solid rgba(148,163,184,0.12)",
    transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#e2e8f0",
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "2px",
    outline: "none",
    width: "100%",
  },
  eyeBtn: {
    background: "none",
    border: "none",
    color: "rgba(148,163,184,0.5)",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    flexShrink: 0,
    transition: "color 0.2s",
  },

  // Error & validating
  errorRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 2,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: 500,
  },
  validatingRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    paddingLeft: 2,
  },
  validatingText: {
    color: "rgba(34,211,238,0.5)",
    fontSize: 12,
    fontWeight: 500,
    fontStyle: "italic",
  },

  // Button
  submitBtn: {
    marginTop: 8,
    width: "100%",
    height: 50,
    background: "linear-gradient(135deg, #4338ca 0%, #6d28d9 40%, #4f46e5 100%)",
    color: "#fff",
    border: "1px solid rgba(99,102,241,0.3)",
    borderRadius: 14,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: "0.5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    boxShadow: "0 4px 24px rgba(99,102,241,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
  },

  // Footer
  footer: {
    marginTop: 26,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 10,
    color: "rgba(100,116,139,0.5)",
    fontWeight: 500,
    letterSpacing: "0.3px",
  },

  // Sparkle
  sparkle: {
    position: "absolute" as const,
    bottom: 40,
    right: 50,
    fontSize: 28,
    color: "rgba(148,163,184,0.2)",
    zIndex: 5,
    pointerEvents: "none" as const,
  },
};
