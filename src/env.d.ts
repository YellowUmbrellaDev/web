/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

type ENV = {
  TURNSTILE_SECRET_KEY: string;
  WEBHOOK_URL: string;
};

type Runtime = import("@astrojs/cloudflare").Runtime<ENV>;

declare namespace App {
  interface Locals extends Runtime {}
}