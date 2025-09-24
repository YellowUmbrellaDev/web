import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import cloudflare from '@astrojs/cloudflare';

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  output: "server", //El output server es necesario para que i18n funcione, para mas info mirar la documentacion del mismo
  adapter: cloudflare({
  }),
  image: {
    domains: ["yellowumbrella.dev"],
  },
  i18n: {
    locales: ["es", "en"],
    defaultLocale: "es",
    routing: {
      prefixDefaultLocale: true
    }
  }
});