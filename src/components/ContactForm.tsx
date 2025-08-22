import React from "react";
import { useForm } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import type { Value as PhoneValue } from "react-phone-number-input";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import "react-phone-number-input/style.css";

type FormInputs = {
  empresa: string;
  nombreCompleto: string;
  cargo?: string;
  email: string;
  mensaje: string;
};

function splitFullName(fullName: string): { nombre: string; apellidos: string } {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { nombre: "", apellidos: "" };
  if (parts.length === 1) return { nombre: parts[0], apellidos: "" };
  const [first, ...rest] = parts;
  return { nombre: first, apellidos: rest.join(" ") };
}

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormInputs>();
  const [telefono, setTelefono] = React.useState<string | undefined>(undefined);
  const formRef = React.useRef<HTMLFormElement>(null);
  const turnstileRef = React.useRef<TurnstileInstance | null>(null);
  const [turnstileToken, setTurnstileToken] = React.useState<string>("");
  const [turnstileReady, setTurnstileReady] = React.useState<boolean>(false);
  const [status, setStatus] = React.useState<
    | { type: "idle" }
    | { type: "success" }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const onSubmit = async (data: FormInputs) => {
    setStatus({ type: "idle" });
    try {
      // Obtener el token de Turnstile - primero del estado, luego del ref como fallback
      let token = turnstileToken;
      if (!token && turnstileRef.current) {
        token = turnstileRef.current.getResponse() || "";
      }
      
      if (!token) {
        setStatus({ type: "error", message: "Por favor, completa el captcha antes de enviar" });
        return;
      }

      const payload = {
        empresa: data.empresa,
        nombreCompleto: data.nombreCompleto,
        cargo: data.cargo ?? "",
        email: data.email,
        mensaje: data.mensaje,
        telefono: (telefono as string) || "",
        turnstileToken: token,
      };


      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json", "cf-token": token },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Error al enviar el formulario");
      }

      setStatus({ type: "success" });
      reset();
      setTelefono(undefined);
      setTurnstileToken("");
      // Reset Turnstile widget using ref
      turnstileRef.current?.reset();
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "Error inesperado" });
    }
  };

  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;

  return (
    <form
      ref={formRef}
      className="mx-auto w-full max-w-xl space-y-4 rounded-lg bg-white/5 p-6 backdrop-blur-md"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="empresa">
          Nombre de la empresa
        </label>
        <input
          id="empresa"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder="Yellow Umbrella Tech"
          {...register("empresa", { required: true })}
        />
        {errors.empresa && (
          <p className="mt-1 text-sm text-red-400">Este campo es obligatorio</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="nombreCompleto">
          Nombre y apellidos
        </label>
        <input
          id="nombreCompleto"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder="Ana García Rodríguez"
          {...register("nombreCompleto", { required: true, minLength: 2 })}
        />
        {errors.nombreCompleto && (
          <p className="mt-1 text-sm text-red-400">Introduce tu nombre completo</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="cargo">
          Cargo en la empresa (opcional)
        </label>
        <input
          id="cargo"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder="CEO, CTO, etc."
          {...register("cargo")}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder="ana.garcia@empresa.com"
          {...register("email", {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          })}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">Introduce un email válido</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white">Teléfono (opcional)</label>
        <div className="rounded-md border border-white/20 bg-white/10 p-2 text-white focus-within:border-yellow-400">
          <PhoneInput
            defaultCountry="ES"
            placeholder="+34 600 123 456"
            value={telefono}
            onChange={setTelefono}
            smartCaret={false}
            international
            className="PhoneInput text-black [&_.PhoneInputCountrySelect]:text-black [&_.PhoneInputCountry]:mr-2 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-md [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:p-2 [&_.PhoneInputInput]:text-white placeholder:!text-white/50"
          />
        </div>
        {telefono && typeof telefono === "string" && !isValidPhoneNumber(telefono) && (
          <p className="mt-1 text-sm text-yellow-300">
            El número puede no ser válido. Revisa el país y formato.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="mensaje">
          Mensaje
        </label>
        <textarea
          id="mensaje"
          rows={5}
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder="Cuéntanos en qué podemos ayudarte..."
          {...register("mensaje", {})}
        />
      </div>

      <div className="pt-2">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          options={{
            theme: "dark",
            language: "es",
          }}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setTurnstileReady(true);
          }}
          onError={(error) => {
            setTurnstileToken("");
            setTurnstileReady(false);
          }}
          onExpire={() => {
            setTurnstileToken("");
            setTurnstileReady(false);
          }}
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting || (siteKey && !turnstileReady)}
          className="relative inline-flex items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-yellow-500 p-0.5 text-sm font-medium text-white focus:outline-none focus:ring-4 focus:ring-pink-500 disabled:opacity-50"
        >
          <span className="rounded-md bg-gray-900 px-5 py-2.5 transition-all duration-75 ease-in group-hover:bg-opacity-0">
            {isSubmitting ? "Enviando..." : "Enviar"}
          </span>
        </button>
      </div>

      {status.type === "success" && (
        <p className="text-sm text-green-400">¡Gracias! Hemos recibido tu solicitud.</p>
      )}
      {status.type === "error" && (
        <p className="text-sm text-red-400">{status.message}</p>
      )}
    </form>
  );
}


