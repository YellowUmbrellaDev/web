// src/pages/[...og].png.ts - Manejo unificado de todas las rutas OG
import satori from 'satori';
import type { APIRoute } from 'astro';
import React from 'react';
import { OgImageTemplate } from '../components/OgImageTemplate';
import pagesData from '../api/pages.json';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  try {
    // Cargar fuente MonaspaceKrypton con fallback más robusto
    let fontData: ArrayBuffer | null = null;
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
    } catch (localError) {
      console.error('Error cargando MonaspaceKrypton en unified og:', localError);
    }

    const ogParam = params.og || '';
    
    // Manejar la ruta correctamente para todas las rutas OG unificadas
    let requestedPath: string | undefined;
    
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
    
    const page = pagesData.pages.find(p => p.url === requestedPath);

    const { title, description } = page;
    
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
  }
};
