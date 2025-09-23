// src/pages/[...og].png.ts
import type { APIRoute } from 'astro';
import { generateOgImageSvg } from '../components/OgImageTemplate';
import pagesData from '../api/pages.json';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const ogParam = params.og || '';
    
    // Determinar la ruta solicitada
    let requestedPath: string;
    
    if (!ogParam || ogParam === '' || ogParam === 'og.png') {
      requestedPath = '/';
    } else {
      let cleanRoute = '';
      
      if (Array.isArray(ogParam)) {
        if (ogParam.length >= 2) {
          cleanRoute = ogParam[1];
        } else if (ogParam.length === 1 && ogParam[0] !== 'og') {
          cleanRoute = ogParam[0];
        }
      } else {
        if (ogParam === 'og') {
          requestedPath = '/';
        } else {
          cleanRoute = ogParam.replace(/^og\//, '');
        }
      }
      
      if (cleanRoute) {
        cleanRoute = cleanRoute.replace(/\.png$/, '');
        requestedPath = `/${cleanRoute}`;
      } else if (!requestedPath) {
        requestedPath = '/';
      }
    }
    
    // Buscar los datos de la página
    const page = pagesData.pages.find(p => p.url === requestedPath) || pagesData.pages[0];
    const { title, description } = page;
    
    // Generar el SVG
    const svgContent = generateOgImageSvg({ title, description });
    
    return new Response(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
    
  } catch (error) {
    console.error('Error generando imagen OG:', error);
    
    const fallbackSvg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#1a1a1a"/>
  <text x="600" y="280" text-anchor="middle" fill="#ffd300" font-size="48" font-family="Arial, sans-serif" font-weight="bold">
    Yellow Umbrella
  </text>
  <text x="600" y="350" text-anchor="middle" fill="#fff" font-size="24" font-family="Arial, sans-serif">
    Error generando imagen
  </text>
</svg>`;
    
    return new Response(fallbackSvg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    });
  }
};
