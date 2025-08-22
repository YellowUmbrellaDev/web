import type { APIRoute } from "astro";

export const prerender = false;

interface ContactRequestBody {
  nombreCompleto?: string;
  email?: string;
  cargo?: string;
  empresa?: string;
  mensaje?: string;
  telefono?: string;
  turnstileToken?: string;
  "cf-turnstile-response"?: string;
  [key: string]: unknown; // Allow for any additional fields
}

type TurnstileResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    let body: ContactRequestBody = {};
    try {
      const rawBody = await request.text();
      if (rawBody) {
        body = JSON.parse(rawBody) as ContactRequestBody;
      }
    } catch (parseError) {
      body = {};
    }
    
    const token =
      (body?.turnstileToken as string | undefined) ||
      (body?.["cf-turnstile-response"] as string | undefined) ||
      request.headers.get("cf-token") ||
      request.headers.get("x-turnstile-token") ||
      undefined;
    
    if (!token) {
      return new Response(JSON.stringify({ error: "missing-turnstile-token" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Acceso correcto a variables de entorno en Cloudflare Pages
    const { env } = locals.runtime;
    const secret = env.TURNSTILE_SECRET_KEY as string | undefined;
    if (!secret) {
      return new Response(JSON.stringify({ error: "server-misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const verifyForm = new FormData();
    verifyForm.append("secret", secret);
    verifyForm.append("response", token);
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) verifyForm.append("remoteip", ip);

    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: verifyForm }
    );
    const outcome = (await verify.json()) as TurnstileResponse;
    if (!outcome.success) {
      return new Response(
        JSON.stringify({ error: "invalid-turnstile", details: outcome["error-codes"] }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const webhookUrl = env.WEBHOOK_URL as string | undefined;
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "missing-webhook-url" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nombreCompleto: string = body?.nombreCompleto || "";
    const split = (full: string) => {
      const parts = full.trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return { nombre: "", apellidos: "" };
      if (parts.length === 1) return { nombre: parts[0], apellidos: "" };
      const [first, ...rest] = parts;
      return { nombre: first, apellidos: rest.join(" ") };
    };
    const { nombre, apellidos } = split(nombreCompleto);

    const payload = {
      cargo: body?.cargo || "",
      email: body?.email || "",
      nombre,
      empresa: body?.empresa || "",
      mensaje: body?.mensaje || "",
      telefono: body?.telefono || "",
      apellidos,
    };

    const forward = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const text = await forward.text();
      return new Response(JSON.stringify({ error: "webhook-failed", details: text }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    return new Response(JSON.stringify({ error: "unexpected", message: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};