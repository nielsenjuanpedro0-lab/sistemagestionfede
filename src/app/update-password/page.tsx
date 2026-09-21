"use client";

import { useState, useEffect } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  // Opcional: verificar si el usuario está autenticado, ya que el link de recovery lo loguea automáticamente.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Sesión inválida o expirada. Por favor, intentá recuperar tu contraseña nuevamente.");
        router.push("/login");
      }
    });
  }, [router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPassword = password.trim();

    if (!cleanPassword || cleanPassword !== confirmPassword.trim()) {
      setError("Las contraseñas no coinciden. Por favor, verificalas.");
      return;
    }

    if (cleanPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { error: updateErr } = await supabase.auth.updateUser({
        password: cleanPassword
      });

      if (updateErr) throw updateErr;

      toast.success("Tu contraseña ha sido actualizada exitosamente.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-card">
        {/* Logo */}
        <div style={{ marginBottom: 32 }}>
          <div
            style={{
              width: 40,
              height: 40,
              background: "var(--text)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <KeyRound size={20} color="var(--on-text)" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              marginBottom: 4,
            }}
          >
            Nueva contraseña
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 14 }}>
            Ingresá tu nueva contraseña para acceder.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="lbl">Nueva contraseña</label>
            <input
              className="inp"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          <div className="field">
            <label className="lbl">Confirmar nueva contraseña</label>
            <input
              className="inp"
              type="password"
              placeholder="Repetí tu nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>

          {error && (
            <div
              style={{
                color: "var(--red)",
                fontSize: 13,
                marginBottom: 16,
                padding: "10px 14px",
                background: "var(--red-dim)",
                borderRadius: 8,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-dark"
            style={{
              width: "100%",
              padding: "12px 16px",
              fontSize: 14,
              marginTop: 4,
              borderRadius: "var(--r)",
            }}
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <Loader2 className="spin" size={16} />
            ) : (
              "Actualizar contraseña"
            )}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button
            className="btn-ghost"
            onClick={() => router.push("/login")}
            style={{ fontSize: 13, color: "var(--text-3)", cursor: "pointer", background: "none", border: "none" }}
            type="button"
          >
            ← Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
