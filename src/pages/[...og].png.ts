// src/pages/[...og].png.ts - Manejo unificado de todas las rutas OG
import satori from 'satori';
import type { APIRoute } from 'astro';
import React from 'react';
import { OgImageTemplate } from '../components/OgImageTemplate';

export const prerender = false;

// Páginas con metadatos
const pagesData = [
  {
    url: '/',
    title: 'Yellow Umbrella',
    description: "It's raining outside, take this"
  },
  {
    url: '/contacto',
    title: 'Contacto',
    description: 'Ponte en contacto con nosotros'
  },
  {
    url: '/redes-sociales',
    title: 'Redes Sociales',
    description: 'Síguenos en nuestras redes sociales'
  },
  {
    url: '/sobre-nosotros',
    title: 'Sobre Nosotros',
    description: 'Conoce más sobre nuestro equipo y misión'
  }
];

export const GET: APIRoute = async ({ params, request }) => {
  try {
    // Cargar fuente MonaspaceKrypton con fallback más robusto
    let fontData;
    let fontName = 'MonaspaceKrypton';
    
    try {
      // Construir URL absoluta para la fuente local
      const url = new URL(request.url);
      const fontUrl = new URL('/fonts/MonaspaceKrypton-Regular.woff', url.origin);
      
      const fontResponse = await fetch(fontUrl.href);
      if (!fontResponse.ok) {
        throw new Error(`MonaspaceKrypton font error: ${fontResponse.status}`);
      }
      fontData = await fontResponse.arrayBuffer();
      console.log('MonaspaceKrypton font loaded successfully (unified og)');
    } catch (localError) {
      console.error('Error cargando MonaspaceKrypton en unified og:', localError);
      
      // Fallback a una fuente WOFF (no WOFF2) que Satori puede manejar
      try {
        const fallbackResponse = await fetch(
          'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa2JL7SUc.woff'
        );
        if (!fallbackResponse.ok) {
          throw new Error(`Inter fallback font error: ${fallbackResponse.status}`);
        }
        fontData = await fallbackResponse.arrayBuffer();
        fontName = 'Inter';
        console.log('Fallback to Inter font (WOFF) for unified og');
      } catch (fallbackError) {
        console.error('Error cargando fuente fallback en unified og:', fallbackError);
        
        // Último fallback: usar sin fuentes personalizadas
        console.log('Using system fonts as last fallback for unified og');
        fontData = null;
        fontName = 'Arial, sans-serif';
      }
    }

    const ogParam = params.og || '';
    
    // Debugging - vamos a ver qué estamos recibiendo
    console.log('Raw og param:', ogParam);
    console.log('Type of og:', typeof ogParam);
    console.log('Is array:', Array.isArray(ogParam));
    
    // Manejar la ruta correctamente para todas las rutas OG unificadas
    let requestedPath;
    
    if (!ogParam || ogParam === '' || ogParam === 'og.png') {
      // Para /og.png (página principal)
      requestedPath = '/';
    } else {
      // Para rutas como /og/contacto.png
      let cleanRoute = '';
      
      if (Array.isArray(ogParam)) {
        // Para rutas como og/contacto.png -> ["og", "contacto.png"]
        if (ogParam.length >= 2) {
          cleanRoute = ogParam[1]; // Tomar "contacto.png"
        } else if (ogParam.length === 1 && ogParam[0] !== 'og') {
          cleanRoute = ogParam[0]; // Caso edge donde solo hay un segmento
        }
      } else {
        // Si es string, podría ser "og" (para /og.png) o "og/contacto.png"
        if (ogParam === 'og') {
          requestedPath = '/';
        } else {
          cleanRoute = ogParam.replace(/^og\//, ''); // Remover prefijo "og/"
        }
      }
      
      if (cleanRoute) {
        // Removemos la extensión .png si existe
        cleanRoute = cleanRoute.replace(/\.png$/, '');
        // Construimos la ruta final
        requestedPath = `/${cleanRoute}`;
      } else if (!requestedPath) {
        requestedPath = '/'; // Fallback a página principal
      }
    }
    
    console.log('OG param:', ogParam, 'Requested path:', requestedPath);
    
    const page = pagesData.find(p => p.url === requestedPath);
    
    if (!page) {
      console.error(`Page not found for path: ${requestedPath}`);
      console.log('Available pages:', pagesData.map(p => p.url));
      
      // Devolver una imagen de error básica en SVG
      const errorSvg = `
        <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#1a1a1a"/>
          <text x="600" y="300" text-anchor="middle" fill="#ffd300" font-size="48" font-family="Arial">
            Page Not Found
          </text>
          <text x="600" y="360" text-anchor="middle" fill="#cccccc" font-size="24" font-family="Arial">
            ${requestedPath}
          </text>
        </svg>
      `;
      
      return new Response(errorSvg, {
        status: 404,
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    const { title, description } = page;
    console.log(`Generating OG image for: ${title} - ${description}`);
    console.log(`Using font: ${fontName}`);
    
    // Crear el componente con propiedades adicionales para debugging
    const element = React.createElement(OgImageTemplate, { 
      title, 
      description,
      fontFamily: fontData ? fontName : 'Arial, sans-serif', // Usar Arial si no hay fuente personalizada
    });

    // Configuración robusta de Satori
    const satoriConfig = {
      width: 1200,
      height: 630,
      fonts: fontData ? [
        {
          name: fontName,
          data: fontData,
          weight: 400 as const,
          style: 'normal' as const,
        },
      ] : [], // Array vacío si no hay datos de fuente
      debug: false, // Cambiar a true para debugging visual
    };

    console.log('Satori config (unified og):', JSON.stringify({
      width: satoriConfig.width,
      height: satoriConfig.height,
      fontsCount: satoriConfig.fonts.length,
      fontNames: satoriConfig.fonts.map(f => f.name),
    }));

    const svg = await satori(element, satoriConfig);

    // Devolver SVG con headers apropiados para mejor compatibilidad
    // Muchas plataformas de redes sociales aceptan SVG para Open Graph
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error generando imagen OG (unified):', error);
    
    // Crear una imagen de error más informativa
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.message.includes('Unsupported OpenType signature')) {
        errorMessage = 'Font format not supported (try WOFF instead of WOFF2)';
      } else if (error.message.includes('Failed to parse URL')) {
        errorMessage = 'Invalid font URL';
      }
    }
    
    // Devolver una imagen de error en SVG simple y funcional
    const errorSvg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1a1a1a"/>
        <circle cx="600" cy="250" r="60" fill="#ffd300"/>
        <text x="600" y="265" text-anchor="middle" fill="#1a1a1a" font-size="40" font-family="Arial, sans-serif" font-weight="bold">YU</text>
        <text x="600" y="350" text-anchor="middle" fill="#ff4444" font-size="32" font-family="Arial, sans-serif" font-weight="bold">
          Error Generating Image
        </text>
        <text x="600" y="400" text-anchor="middle" fill="#cccccc" font-size="20" font-family="Arial, sans-serif">
          ${errorMessage}
        </text>
        <text x="600" y="450" text-anchor="middle" fill="#999999" font-size="16" font-family="Arial, sans-serif">
          Route: ${params.og || 'unified-og'}
        </text>
      </svg>
    `;
    
    return new Response(errorSvg, {
      status: 500,
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  }
};
