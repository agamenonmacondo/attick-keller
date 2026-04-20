"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Users, User, Phone, Envelope, ChatCircle, CheckCircle, ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { useAuth } from "@/lib/auth/auth-provider";

// Step schemas
const step1Schema = z.object({
  date: z.string().min(1, "Selecciona una fecha"),
  partySize: z.number().min(1, "Mínimo 1 persona").max(12, "Máximo 12 personas"),
});

const step2Schema = z.object({
  time: z.string().min(1, "Selecciona una hora"),
  zone: z.string().min(1, "Selecciona una zona"),
});

const step3Schema = z.object({
  name: z.string().min(2, "Ingresa tu nombre"),
  phone: z.string().min(7, "Ingresa un teléfono válido"),
  email: z.email("Ingresa un email válido"),
  specialRequests: z.string().optional(),
});

const fullSchema = step1Schema.and(step2Schema).and(step3Schema);

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type FullData = z.infer<typeof fullSchema>;

const timeSlots = [
  "12:00", "12:30", "13:00", "13:30",
  "18:00", "18:30", "19:00", "19:30",
  "20:00", "20:30", "21:00", "21:30",
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
    scale: 0.95,
  }),
};

export default function ReservationForm() {
  const [step, setStep] = useState(0);
  const [zones, setZones] = useState<{id: string; name: string}[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { user, loading } = useAuth();
  const router = useRouter();

  const form = useForm<FullData>({
    resolver: zodResolver(fullSchema),
    defaultValues: {
      date: "",
      partySize: 2,
      time: "",
      zone: "",
      name: "",
      phone: "",
      email: "",
      specialRequests: "",
    },
  });

  // Note: auth protection is handled by middleware. The client-side
  // loading/user checks below prevent flash of content, but we do NOT
  // redirect to login here — that caused redirect loops when the middleware
  // had a valid session but the client hadn't resolved it yet.

  // Pre-fill form with user data when authenticated
  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.name || user.user_metadata?.full_name || '';
      const phone = user.phone || '';
      const email = user.email || '';
      if (name) form.setValue('name', name);
      if (phone) form.setValue('phone', phone);
      if (email) form.setValue('email', email);
    }
  }, [user, form]);

  // Load zones from API
  useEffect(() => {
    setZonesLoading(true)
    fetch('/api/zones').then(r => {
      if (!r.ok) throw new Error('Failed to load zones');
      return r.json();
    }).then(data => {
      if (Array.isArray(data)) setZones(data);
    }).catch(() => {
      setSubmitError('No se pudieron cargar las zonas. Intenta recargar la página.');
    }).finally(() => {
      setZonesLoading(false)
    });
  }, []);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ak-wine border-t-transparent" />
      </div>
    );
  }

  // If auth resolved and no user, show message with link to login
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-ak-charcoal/60">Debes iniciar sesión para reservar.</p>
        <a
          href="/auth/login?redirect=/reservar"
          className="rounded-lg bg-ak-wine px-6 py-3 text-sm font-semibold text-ak-cream transition-colors hover:bg-ak-wine-light"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  const goNext = async () => {
    let valid = false;
    if (step === 0) valid = await form.trigger(["date", "partySize"]);
    else if (step === 1) valid = await form.trigger(["time", "zone"]);
    else if (step === 2) valid = await form.trigger(["name", "phone", "email"]);

    if (valid) {
      setDirection(1);
      setStep((s) => Math.min(s + 1, 3));
    }
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const submitReservation = async () => {
    const d = form.getValues();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const r = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: d.name,
          phone: d.phone,
          email: d.email,
          date: d.date,
          time: d.time,
          partySize: d.partySize,
          zoneId: d.zone,
          zone: zones.find(z => z.id === d.zone)?.name || d.zone,
          specialRequests: d.specialRequests,
        }),
      });

      const result = await r.json();
      if (result.success) {
        const reservationId = result.reservation?.id;
        if (reservationId) {
          router.push(`/reservar/confirmado?id=${encodeURIComponent(reservationId)}`);
        } else {
          router.push('/perfil');
        }
      } else {
        setSubmitError(result.error || 'Error al crear la reserva. Intenta de nuevo.');
      }
    } catch {
      setSubmitError('Error de conexión. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepLabels = ["Fecha", "Hora y Zona", "Datos", "Confirmar"];

  return (
    <div className="mx-auto w-full max-w-xl">
      {/* Progress bar */}
      <div className="mb-8 flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300",
                i <= step
                  ? "bg-ak-wine text-ak-cream"
                  : "bg-ak-cream-light text-ak-charcoal/40"
              )}
            >
              {i + 1}
            </div>
            {i < stepLabels.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 transition-colors duration-300",
                  i < step ? "bg-ak-wine" : "bg-ak-charcoal/10"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="relative min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {step === 0 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-ak-wine">
                <Calendar size={24} />
                <h3 className="font-[Playfair_Display] text-xl">
                  ¿Cuándo vienes?
                </h3>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ak-charcoal">
                  Fecha
                </label>
                <input
                  type="date"
                  {...form.register("date")}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full rounded-lg border border-ak-charcoal/10 bg-white px-4 py-3 text-ak-charcoal outline-none transition-colors focus:border-ak-wine"
                />
                {form.formState.errors.date && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-ak-charcoal">
                  Número de personas
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue(
                        "partySize",
                        Math.max(1, (form.watch("partySize") ?? 2) - 1)
                      )
                    }
                    className="button-press flex h-10 w-10 items-center justify-center rounded-lg border border-ak-charcoal/10 text-ak-charcoal transition-colors hover:border-ak-wine"
                  >
                    -
                  </button>
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-ak-wine" />
                    <span className="min-w-[2ch] text-center text-xl font-semibold text-ak-charcoal">
                      {form.watch("partySize") ?? 2}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      form.setValue(
                        "partySize",
                        Math.min(12, (form.watch("partySize") ?? 2) + 1)
                      )
                    }
                    className="button-press flex h-10 w-10 items-center justify-center rounded-lg border border-ak-charcoal/10 text-ak-charcoal transition-colors hover:border-ak-wine"
                  >
                    +
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-ak-wine">
                <Clock size={24} />
                <h3 className="font-[Playfair_Display] text-xl">
                  ¿A qué hora?
                </h3>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-ak-charcoal">
                  Hora
                </label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => form.setValue("time", t)}
                      className={cn(
                        "button-press rounded-full px-4 py-2 text-sm font-medium transition-colors",
                        form.watch("time") === t
                          ? "bg-ak-wine text-ak-cream"
                          : "bg-ak-cream-light text-ak-charcoal/70 hover:bg-ak-wine/10"
                      )}
                    >
                      {formatTime(t)}
                    </button>
                  ))}
                </div>
                {form.formState.errors.time && (
                  <p className="mt-2 text-sm text-red-600">
                    {form.formState.errors.time.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-ak-charcoal">
                  Zona
                </label>
                {zonesLoading ? (
                  <div className="flex items-center gap-2 text-ak-charcoal/40">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-ak-wine border-t-transparent" />
                    <span className="text-sm">Cargando zonas...</span>
                  </div>
                ) : zones.length === 0 ? (
                  <p className="text-sm text-red-600">No se pudieron cargar las zonas.</p>
                ) : (
                  <div className="flex gap-3">
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => form.setValue("zone", z.id)}
                        className={cn(
                          "button-press flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                          form.watch("zone") === z.id
                            ? "bg-ak-wine text-ak-cream"
                            : "bg-ak-cream-light text-ak-charcoal/70 hover:bg-ak-wine/10"
                        )}
                      >
                        {z.name}
                      </button>
                    ))}
                  </div>
                )}
                {form.formState.errors.zone && (
                  <p className="mt-2 text-sm text-red-600">
                    {form.formState.errors.zone.message}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-5"
            >
              <div className="flex items-center gap-3 text-ak-wine">
                <User size={24} />
                <h3 className="font-[Playfair_Display] text-xl">
                  Tus datos
                </h3>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ak-charcoal">
                  Nombre completo
                </label>
                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ak-charcoal/40"
                  />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    {...form.register("name")}
                    className="w-full rounded-lg border border-ak-charcoal/10 bg-white py-3 pl-10 pr-4 text-ak-charcoal outline-none transition-colors focus:border-ak-wine"
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ak-charcoal">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ak-charcoal/40"
                  />
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    {...form.register("phone")}
                    className="w-full rounded-lg border border-ak-charcoal/10 bg-white py-3 pl-10 pr-4 text-ak-charcoal outline-none transition-colors focus:border-ak-wine"
                  />
                </div>
                {form.formState.errors.phone && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ak-charcoal">
                  Email
                </label>
                <div className="relative">
                  <Envelope
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ak-charcoal/40"
                  />
                  <input
                    type="email"
                    placeholder="tu@email.com"
                    {...form.register("email")}
                    className="w-full rounded-lg border border-ak-charcoal/10 bg-white py-3 pl-10 pr-4 text-ak-charcoal outline-none transition-colors focus:border-ak-wine"
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ak-charcoal">
                  Peticiones especiales
                </label>
                <div className="relative">
                  <ChatCircle
                    size={18}
                    className="absolute left-3 top-3 text-ak-charcoal/40"
                  />
                  <textarea
                    placeholder="Alergias, cumpleaños, preferencias..."
                    rows={3}
                    {...form.register("specialRequests")}
                    className="w-full rounded-lg border border-ak-charcoal/10 bg-white py-3 pl-10 pr-4 text-ak-charcoal outline-none transition-colors focus:border-ak-wine resize-none"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step4"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-ak-olive">
                <CheckCircle size={24} weight="fill" />
                <h3 className="font-[Playfair_Display] text-xl">
                  Confirma tu reserva
                </h3>
              </div>

              <div className="rounded-2xl border border-ak-charcoal/5 bg-white p-6 space-y-3">
                {[
                  { label: "Nombre", value: form.watch("name") },
                  { label: "Fecha", value: form.watch("date") },
                  { label: "Hora", value: form.watch("time") },
                  { label: "Personas", value: `${form.watch("partySize") ?? 2}` },
                  { label: "Zona", value: zones.find((z) => z.id === form.watch("zone"))?.name ?? form.watch("zone") },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between border-b border-ak-charcoal/5 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-ak-charcoal/60">
                      {row.label}
                    </span>
                    <span className="text-sm font-semibold text-ak-charcoal">
                      {row.value}
                    </span>
                  </div>
                ))}
                {form.watch("specialRequests") && (
                  <p className="text-sm text-ak-charcoal/60 italic">
                    &ldquo;{form.watch("specialRequests")}&rdquo;
                  </p>
                )}
              </div>

              <p className="text-center text-sm text-ak-charcoal/60">
                Al confirmar, guardaremos tu reserva.
              </p>

              {submitError && (
                <p className="text-center text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
                  {submitError}
                </p>
              )}

              <button
                onClick={submitReservation}
                disabled={submitting}
                className="button-press flex w-full items-center justify-center gap-2 rounded-lg bg-ak-olive px-6 py-3.5 text-base font-semibold text-ak-cream transition-colors hover:bg-ak-olive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <CheckCircle size={20} weight="fill" />
                )}
                {submitting ? 'Guardando...' : 'Confirmar Reserva'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      {step < 3 && (
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="button-press flex items-center gap-2 text-sm font-medium text-ak-charcoal/60 transition-colors hover:text-ak-charcoal"
            >
              <ArrowLeft size={16} />
              Atrás
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={goNext}
            className="button-press flex items-center gap-2 rounded-lg bg-ak-wine px-6 py-3 text-sm font-semibold text-ak-cream transition-colors hover:bg-ak-wine-light"
          >
            Siguiente
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}