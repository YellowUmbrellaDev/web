import React from "react";
import { useForm } from "react-hook-form";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import "react-phone-number-input/style.css";
import { useTranslationsReact, getLangFromUrlReact } from '../i18n/react-utils';

type FormInputs = {
  empresa: string;
  nombreCompleto: string;
  cargo?: string;
  email: string;
  mensaje: string;
};

interface ContactFormProps {
  lang?: string;
}

export default function ContactForm({ lang }: ContactFormProps = {}) {
  // Detectar idioma desde la URL del navegador si no se proporciona
  const currentLang = lang || getLangFromUrlReact(window.location.pathname);
  const t = useTranslationsReact(currentLang as 'es' | 'en');
  
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
        setStatus({ type: "error", message: t('contact.form.captcha.required') });
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
        throw new Error(text || t('contact.form.error'));
      }

      setStatus({ type: "success" });
      reset();
      setTelefono(undefined);
      setTurnstileToken("");
      // Reset Turnstile widget using ref
      turnstileRef.current?.reset();
    } catch (err: unknown) {
      setStatus({ type: "error", message: (err instanceof Error ? err.message : String(err)) || t('contact.form.error') });
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
          {t('contact.form.company')}
        </label>
        <input
          id="empresa"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder={t('contact.form.company.placeholder')}
          {...register("empresa", { required: true })}
        />
        {errors.empresa && (
          <p className="mt-1 text-sm text-red-400">{t('contact.form.company.required')}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="nombreCompleto">
          {t('contact.form.name')}
        </label>
        <input
          id="nombreCompleto"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder={t('contact.form.name.placeholder')}
          {...register("nombreCompleto", { required: true, minLength: 2 })}
        />
        {errors.nombreCompleto && (
          <p className="mt-1 text-sm text-red-400">{t('contact.form.name.required')}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="cargo">
          {t('contact.form.position')}
        </label>
        <input
          id="cargo"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder={t('contact.form.position.placeholder')}
          {...register("cargo")}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="email">
          {t('contact.form.email')}
        </label>
        <input
          id="email"
          type="email"
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder={t('contact.form.email.placeholder')}
          {...register("email", {
            required: true,
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          })}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{t('contact.form.email.required')}</p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="telefono">{t('contact.form.phone')}</label>
        <div className="rounded-md border border-white/20 bg-white/10 p-2 text-white focus-within:border-yellow-400">
          <PhoneInput
            id="telefono"
            defaultCountry={currentLang === 'es' ? "ES" : "US"}
            placeholder={t('contact.form.phone.placeholder')}
            value={telefono}
            onChange={setTelefono}
            smartCaret={false}
            international
            className="PhoneInput text-black [&_.PhoneInputCountrySelect]:text-black [&_.PhoneInputCountry]:mr-2 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:rounded-md [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:p-2 [&_.PhoneInputInput]:text-white placeholder:!text-white/50"
          />
        </div>
        {telefono && typeof telefono === "string" && !isValidPhoneNumber(telefono) && (
          <p className="mt-1 text-sm text-yellow-300">
            {t('contact.form.phone.invalid')}
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-white" htmlFor="mensaje">
          {t('contact.form.message')}
        </label>
        <textarea
          id="mensaje"
          rows={5}
          className="w-full rounded-md border border-white/20 bg-white/10 p-3 text-white placeholder-white/50 focus:border-yellow-400 focus:outline-none"
          placeholder={t('contact.form.message.placeholder')}
          {...register("mensaje", {})}
        />
      </div>

      <div className="pt-2">
        <Turnstile
          ref={turnstileRef}
          siteKey={siteKey}
          options={{
            theme: "dark",
            language: currentLang as "es" | "en",
          }}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setTurnstileReady(true);
          }}
          onError={(_error) => {
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
          className="relative inline-flex items-center justify-center w-32 h-16 p-[2px] mb-2 mr-4 overflow-hidden font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-[#ffd300] to-[#773376] group-hover:from-[#ffd300] group-hover:to-[#773376] hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-[#773376] dark:focus:ring-[#773376]"
        >
          <span className="relative w-full h-full px-2 py-1 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-[6px] group-hover:bg-opacity-0 flex items-center justify-center text-xl lg:text-lg md:text-base sm:text-sm text-center leading-tight">
            {isSubmitting ? t('contact.form.sending') : t('contact.form.send')}
          </span>
        </button>
      </div>

      {status.type === "success" && (
        <p className="text-sm text-green-400">{t('contact.form.success')}</p>
      )}
      {status.type === "error" && (
        <p className="text-sm text-red-400">{status.message}</p>
      )}
    </form>
  );
}

