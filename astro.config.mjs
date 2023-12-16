import { defineConfig } from 'astro/config';
import react from "@astrojs/react";
import node from "@astrojs/node";


import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  integrations: [react(), tailwind()],
  output: "hybrid",
  adapter: node({
    mode: "standalone"
  }),
  image: {
    domains: ["blog.nereacassian.com", "blog.yellowumbrella.dev", "yellowumbrella.dev", "nereacassian.com"],
  }
});