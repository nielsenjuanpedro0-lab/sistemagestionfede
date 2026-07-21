"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle2, Store, Wrench, Smartphone, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import styles from "../../components/Onboarding.module.css";

const steps = [
  { id: 1, type: "input" },
  { id: 2, type: "options" },
  { id: 3, type: "options" },
  { id: 4, type: "form" }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    currentMethod: "",
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const nextStep = () => {
    if (currentStep < steps.length) setCurrentStep(s => s + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const isStepValid = () => {
    if (currentStep === 1) return formData.businessName.trim().length > 0;
    if (currentStep === 2) return formData.businessType !== "";
    if (currentStep === 3) return formData.currentMethod !== "";
    if (currentStep === 4) return formData.email.includes("@") && formData.password.length >= 6;
    return true;
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!isStepValid()) return;
    
    setLoading(true);
    setError("");

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setError("Error de configuración: Faltan las variables de entorno de Supabase (.env.local).");
      setLoading(false);
      return;
    }
    
    try {
      const { data, error: regErr } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
      });
      
      if (regErr) throw regErr;
      
      if (data.user) {
        const { data: orgId, error: rpcErr } = await supabase.rpc(
          "create_new_tenant",
          {
            org_name: formData.businessName,
            user_name: "Fede",
          }
        );

        if (rpcErr) throw rpcErr;

        await supabase.from("profiles").upsert({
          id: data.user.id,
          name: "Fede",
          email: formData.email.trim().toLowerCase(),
          role: "owner",
          org_id: orgId,
          initials: "FE",
          color: "#f59e0b",
        });

        router.push("/dashboard");
      }
    } catch (err: any) {
      let msg = err.message || "Error al crear la cuenta.";
      if (msg.includes("User already registered")) {
        msg = "Este email ya está registrado. Por favor, inicia sesión.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className={styles.logo}>
            <Image src="/logo.png" alt="Logo" width={32} height={32} />
            Stackr
          </div>
        </Link>
        <div className={styles.progress}>
          Paso {currentStep} de {steps.length}
        </div>
      </header>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={styles.stepContainer}
          >
            {currentStep === 1 && (
              <div>
                <h1 className={styles.question}>
                  ¡Hola! Para empezar a configurar tu cuenta, ¿cómo se llama tu negocio?
                </h1>
                <div className={styles.inputGroup}>
                  <input
                    autoFocus
                    type="text"
                    className={styles.input}
                    placeholder="Ej. TecnoFix Center"
                    value={formData.businessName}
                    onChange={e => setFormData({ ...formData, businessName: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && isStepValid() && nextStep()}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h1 className={styles.question}>
                  ¿A qué se dedica principalmente {formData.businessName}?
                </h1>
                <div className={styles.optionsGrid}>
                  {[
                    { id: 'ventas', label: 'Solo venta de equipos y accesorios', icon: <Store /> },
                    { id: 'reparaciones', label: 'Principalmente servicio técnico', icon: <Wrench /> },
                    { id: 'ambas', label: 'Ambas (Venta y Servicio Técnico)', icon: <Smartphone /> }
                  ].map(opt => (
                    <div 
                      key={opt.id}
                      className={`${styles.optionCard} ${formData.businessType === opt.id ? styles.selected : ''}`}
                      onClick={() => {
                        setFormData({ ...formData, businessType: opt.id });
                        setTimeout(nextStep, 300); // Auto-advance
                      }}
                    >
                      {formData.businessType === opt.id ? <CheckCircle2 color="#111" /> : opt.icon}
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h1 className={styles.question}>
                  ¿Cómo llevas el control de tu inventario y reparaciones hoy?
                </h1>
                <div className={styles.optionsGrid}>
                  {[
                    { id: 'papel', label: 'Papel, lápiz y memoria' },
                    { id: 'excel', label: 'Planillas de Excel o Google Sheets' },
                    { id: 'software', label: 'Otro software que no me convence' }
                  ].map(opt => (
                    <div 
                      key={opt.id}
                      className={`${styles.optionCard} ${formData.currentMethod === opt.id ? styles.selected : ''}`}
                      onClick={() => {
                        setFormData({ ...formData, currentMethod: opt.id });
                        setTimeout(nextStep, 300); // Auto-advance
                      }}
                    >
                      {formData.currentMethod === opt.id && <CheckCircle2 color="#111" />}
                      <span style={{ marginLeft: formData.currentMethod === opt.id ? 0 : '40px' }}>
                        {opt.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div>
                <h1 className={styles.question}>
                  ¡Todo listo! Creamos tu cuenta para {formData.businessName}.
                </h1>
                <form onSubmit={handleSubmit}>
                  {error && (
                    <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 16, padding: "10px", background: "var(--red-dim)", borderRadius: 8 }}>
                      {error}
                    </div>
                  )}
                  <div className={styles.formField}>
                    <label>Tu correo electrónico</label>
                    <input 
                      type="email" 
                      placeholder="ejemplo@correo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formField}>
                    <label>Contraseña para tu cuenta</label>
                    <input 
                      type="password" 
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </form>
              </div>
            )}

            <div style={{ marginTop: '40px', display: 'flex', alignItems: 'center' }}>
              {currentStep > 1 && (
                <button className={styles.backBtn} onClick={prevStep}>
                  <ArrowLeft size={18} /> Volver
                </button>
              )}
              
              {currentStep < steps.length ? (
                <button 
                  className={styles.btnNext} 
                  onClick={nextStep}
                  disabled={!isStepValid()}
                >
                  Continuar <ArrowRight size={20} />
                </button>
              ) : (
                <button 
                  className={styles.btnNext} 
                  onClick={handleSubmit}
                  disabled={!isStepValid() || loading}
                >
                  {loading ? <Loader2 className="spin" size={20} /> : <>Comenzar prueba gratis de 48hs <ArrowRight size={20} /></>}
                </button>
              )}
            </div>

          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
