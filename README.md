<h1 align="center">
    The Yellow Umbrella Web
</h1>


<p align="center">
  <img src="https://yellowumbrella.dev/yellowumbrella512.png">
</p>

<p align="center">
  <a href="https://yellowumbrella.dev">yellowumbrella.dev</a>
</p>

<h1 align="center">
    Made with 
    <img align="center" src="https://yellowumbrella.dev/Astro.svg">
</h1>

## Development
### Install dependencies

``npm install``

### Run the development server

``npm run dev``

## Production

The site is static and is served from Cloudflare Workers (static assets).

``npm run preview`` builds the site and serves it locally with `wrangler dev`.

``npx wrangler deploy`` deploys it (run `npm run build` first).

The contact form no longer exists. Wrangler does not delete secrets already stored on the Worker, so remove `TURNSTILE_SECRET_KEY` and `WEBHOOK_URL` from the dashboard or with `npx wrangler secret delete <NAME>`.

## Project structure

```text
├── public
│   │ // Static files
│   │
│   ├── fonts
│    // Fonts used in the website
│   
├── src
│   ├── components
│   │ // Components used in the pages
│   │
│   ├── layouts
│   │ // Layouts used in the pages
│   │
│   ├── pages
│     // Pages of the website
│   
```