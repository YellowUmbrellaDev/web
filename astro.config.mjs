import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import cloudflare from '@astrojs/cloudflare';

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  output: "hybrid",
  adapter: cloudflare(),
  image: {
    domains: ["blog.nereacassian.com", "blog.yellowumbrella.dev", "yellowumbrella.dev", "nereacassian.com"],
  }
});