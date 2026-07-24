"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmUserEmail } from "@/app/actions";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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
          align-items: center;
          justify-content: center;
          font-family: 'Inter', system-ui, sans-serif;
          background: #fafafa;
          padding: 24px;
        }

        .lp-form-wrap {
          width: 100%;
          max-width: 380px;
        }

        .lp-brand {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 32px;
        }
        .lp-brand-name {
          font-size: 20px;
          font-weight: 800;
          color: #111;
          letter-spacing: -0.03em;
        }

        .lp-form-card {
          background: #fff;
          border-radius: 20px;
          padding: 32px;
          border: 1px solid rgba(0,0,0,0.07);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06);
        }

        .lp-form-title {
          font-size: 22px;
          font-weight: 800;
          color: #000;
          letter-spacing: -0.03em;
          margin-bottom: 24px;
          text-align: center;
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

        @media (max-width: 900px) {
          .lp-input {
            padding: 14px 15px;
            font-size: 16px; /* prevent iOS zoom */
          }
        }
      `}</style>

      <div className="lp-root">
        <motion.div
          className="lp-form-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="lp-brand">
            <Image src="/logo.png" alt="Logo" width={32} height={32} style={{ borderRadius: 8 }} />
          </div>

          <div className="lp-form-card">
            <div className="lp-form-title">{isLogin ? "Iniciar sesión" : "Creá tu cuenta"}</div>
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
                      <input className="lp-input" type="text" placeholder="Ej. MundoApple" value={orgName} onChange={e => setOrgName(e.target.value)} required={!isLogin} />
                    </div>
                    <div className="lp-field">
                      <label className="lp-label">Tu nombre</label>
                      <input className="lp-input" type="text" placeholder="Ej. Fede" value={name} onChange={e => setName(e.target.value)} required={!isLogin} />
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
                {loading ? <Loader2 size={18} className="spin" /> : isLogin ? "Ingresar" : "Crear cuenta"}
              </button>
            </form>

            <div className="lp-toggle">
              {isLogin ? "¿No tenés cuenta? " : "¿Ya tenés cuenta? "}
              <button onClick={() => { setIsLogin(!isLogin); setError(""); }}>
                {isLogin ? "Registrate" : "Ingresá acá"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
