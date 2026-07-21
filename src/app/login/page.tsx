"use client";

import { useState } from "react";
import { Loader2, Package, CalendarDays, TrendingUp } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmUserEmail } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  { icon: <Package size={15} />, label: "Stock y ventas en tiempo real" },
  { icon: <CalendarDays size={15} />, label: "Servicio técnico y reparaciones" },
  { icon: <TrendingUp size={15} />, label: "Rentabilidad por equipo y vendedor" },
];

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) { setError("Ingresá tu email para enviarte el enlace de recuperación."); return; }
    try {
      setLoading(true);
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/update-password`,
      });
      if (resetErr) throw resetErr;
      setError("");
      toast.success("Te enviamos un email para restablecer tu contraseña.");
    } catch (err: any) {
      setError(err.message || "Error al enviar email de recuperación");
    } finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanEmail || !cleanPassword || (!isLogin && (!name || !orgName))) return;
    if (!isLogin && cleanPassword !== confirmPassword.trim()) { setError("Las contraseñas no coinciden."); return; }

    try {
      setLoading(true);
      setError("");

      if (!isLogin) {
        const { data, error: regErr } = await supabase.auth.signUp({ email: cleanEmail, password: cleanPassword });
        if (regErr) throw regErr;
        if (data.user) {
          const { data: orgId, error: rpcErr } = await supabase.rpc("create_new_tenant", { org_name: orgName, user_name: name });
          if (rpcErr) throw rpcErr;
          await supabase.from("profiles").upsert({ id: data.user.id, name, email, role: "owner", org_id: orgId, initials: name.substring(0, 2).toUpperCase(), color: "#f59e0b" });
          router.push("/dashboard");
        }
      } else {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
        if (authErr) throw authErr;
        if (data.user) { router.push("/dashboard"); router.refresh(); }
      }
    } catch (err: any) {
      let msg = err.message || "Error en la autenticación";
      if (msg.includes("User already registered")) { setIsLogin(true); msg = "Este email ya tiene una cuenta. Ingresá tu contraseña para continuar."; }
      else if (msg.includes("Invalid login credentials")) { msg = "Email o contraseña incorrectos."; }
      else if (msg.includes("Password should be at least")) { msg = "La contraseña debe tener al menos 6 caracteres."; }
      else if (msg.toLowerCase().includes("email not confirmed")) {
        try {
          const result = await confirmUserEmail(cleanEmail);
          if (result.success) {
            const { data, error: retryErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });
            if (retryErr) throw retryErr;
            if (data.user) { router.push("/dashboard"); router.refresh(); setLoading(false); return; }
          } else { msg = result.error || "Error al confirmar cuenta."; }
        } catch { msg = "Error al confirmar cuenta. Contactá al administrador."; }
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
          background: #fff;
        }

        /* ── Left panel ── */
        .lp-left {
          flex: 1;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 60px;
          position: relative;
          overflow: hidden;
        }

        .lp-left-bg {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 50% at 20% 20%, rgba(59,130,246,0.07) 0%, transparent 60%),
            radial-gradient(ellipse 60% 40% at 80% 80%, rgba(139,92,246,0.06) 0%, transparent 60%),
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: auto, auto, 40px 40px, 40px 40px;
          pointer-events: none;
        }

        .lp-left-inner { position: relative; z-index: 1; }

        .lp-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
          text-decoration: none;
        }
        .lp-brand-name {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }

        .lp-headline {
          font-size: clamp(28px, 3vw, 42px);
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin-bottom: 18px;
        }
        .lp-headline span { color: rgba(255,255,255,0.4); }

        .lp-sub {
          font-size: 15px;
          color: rgba(255,255,255,0.45);
          line-height: 1.7;
          margin-bottom: 48px;
          max-width: 400px;
        }

        .lp-features {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .lp-feature {
          display: flex;
          align-items: center;
          gap: 12px;
          color: rgba(255,255,255,0.6);
          font-size: 14px;
          font-weight: 500;
        }

        .lp-feature-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: rgba(255,255,255,0.5);
        }

        .lp-left-footer {
          position: relative;
          z-index: 1;
          font-size: 12px;
          color: rgba(255,255,255,0.2);
        }

        /* ── Right panel ── */
        .lp-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 40px;
          background: #fafafa;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .lp-form-head {
          margin-bottom: 32px;
        }

        .lp-form-title {
          font-size: 26px;
          font-weight: 800;
          color: #000;
          letter-spacing: -0.03em;
          margin-bottom: 6px;
        }

        .lp-form-sub {
          font-size: 14px;
          color: #888;
        }

        .lp-form-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .lp-field { margin-bottom: 18px; }
        .lp-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 7px;
        }
        .lp-input {
          width: 100%;
          padding: 13px 15px;
          border: 1.5px solid #e5e7eb;
          border-radius: 11px;
          font-size: 15px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          background: #fff;
          color: #111;
          font-family: inherit;
        }
        .lp-input::placeholder { color: #b0b7c3; }
        .lp-input:focus {
          border-color: #111;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.06);
        }

        .lp-forgot {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.15s;
        }
        .lp-forgot:hover { color: #555; }

        .lp-submit {
          width: 100%;
          padding: 14px;
          background: #000;
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s, transform 0.1s;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .lp-submit:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .lp-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .lp-toggle {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: #9ca3af;
        }
        .lp-toggle button {
          background: none;
          border: none;
          color: #111;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .lp-error {
          background: #fef2f2;
          border: 1px solid rgba(239,68,68,0.2);
          color: #b91c1c;
          font-size: 13px;
          border-radius: 9px;
          padding: 10px 14px;
          margin-bottom: 16px;
          line-height: 1.5;
        }

        /* ── Mobile header (hidden on desktop) ── */
        .lp-mobile-top {
          display: none;
          background: #0a0a0a;
          padding: 28px 24px 32px;
          text-align: center;
        }
        .lp-mobile-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 10px;
        }
        .lp-mobile-name {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.03em;
        }
        .lp-mobile-tagline {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .lp-root { flex-direction: column; }
          .lp-left { display: none; }
          .lp-mobile-top { display: block; }
          .lp-right {
            flex: unset;
            padding: 28px 20px 48px;
            background: #fff;
          }
          .lp-form-card {
            border: none;
            box-shadow: none;
            padding: 0;
            background: transparent;
          }
          .lp-input {
            padding: 14px 15px;
            font-size: 16px; /* prevent iOS zoom */
          }
        }
      `}</style>

      <div className="lp-root">

        {/* Mobile top bar */}
        <div className="lp-mobile-top">
          <div className="lp-mobile-brand">
            <Image src="/logo.png" alt="Stackr" width={28} height={28} style={{ borderRadius: 7 }} />
            <span className="lp-mobile-name">Stackr</span>
          </div>
          <div className="lp-mobile-tagline">El sistema para tu local de celulares</div>
        </div>

        {/* Left panel */}
        <div className="lp-left">
          <div className="lp-left-bg" />

          <div className="lp-left-inner">
            <Link href="/" className="lp-brand">
              <Image src="/logo.png" alt="Stackr" width={36} height={36} style={{ borderRadius: 9 }} />
              <span className="lp-brand-name">Stackr</span>
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="lp-headline">
                Tu local de celulares,<br />
                <span>organizado de una vez.</span>
              </h1>
              <p className="lp-sub">
                Stock, ventas y reparaciones — todo en un panel diseñado para locales de celulares en Argentina.
              </p>

              <div className="lp-features">
                {FEATURES.map((f, i) => (
                  <motion.div
                    key={f.label}
                    className="lp-feature"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                  >
                    <div className="lp-feature-icon">{f.icon}</div>
                    {f.label}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="lp-left-footer">© 2025 Stackr · Hecho en Argentina</div>
        </div>

        {/* Right panel */}
        <div className="lp-right">
          <motion.div
            className="lp-form-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="lp-form-head">
              <div className="lp-form-title">
                {isLogin ? "Bienvenido de nuevo" : "Creá tu cuenta"}
              </div>
              <div className="lp-form-sub">
                {isLogin ? "Ingresá tus credenciales para continuar." : "Completá tus datos para empezar la prueba gratis."}
              </div>
            </div>

            <div className="lp-form-card">
              <form onSubmit={handleSubmit}>
                <AnimatePresence initial={false}>
                  {!isLogin && (
                    <motion.div
                      key="register-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="lp-field">
                        <label className="lp-label">Nombre del negocio</label>
                        <input className="lp-input" type="text" placeholder="Ej. TecnoFix Center" value={orgName} onChange={e => setOrgName(e.target.value)} required={!isLogin} />
                      </div>
                      <div className="lp-field">
                        <label className="lp-label">Tu nombre</label>
                        <input className="lp-input" type="text" placeholder="Ej. Juan Pérez" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="lp-field">
                  <label className="lp-label">Email</label>
                  <input className="lp-input" type="email" placeholder="nombre@empresa.com" value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" autoCorrect="off" spellCheck={false} />
                </div>

                <div className="lp-field" style={{ marginBottom: isLogin ? 8 : 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                    <label className="lp-label" style={{ margin: 0 }}>Contraseña</label>
                    {isLogin && (
                      <button type="button" className="lp-forgot" onClick={handleResetPassword}>
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <input className="lp-input" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required autoCapitalize="none" autoCorrect="off" />
                </div>

                <AnimatePresence initial={false}>
                  {!isLogin && (
                    <motion.div
                      key="confirm-password"
                      className="lp-field"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <label className="lp-label">Confirmar contraseña</label>
                      <input className="lp-input" type="password" placeholder="Repetí tu contraseña" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!isLogin} autoCapitalize="none" autoCorrect="off" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="lp-error"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="lp-submit" type="submit" disabled={loading}>
                  {loading ? <Loader2 size={18} className="spin" /> : isLogin ? "Ingresar" : "Empezar prueba gratis"}
                </button>
              </form>

              <div className="lp-toggle">
                {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
                <button onClick={() => { setIsLogin(!isLogin); setError(""); }}>
                  {isLogin ? "Registrate gratis" : "Ingresá acá"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </>
  );
}
