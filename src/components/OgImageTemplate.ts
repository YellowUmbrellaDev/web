// src/components/OgImageTemplate.ts
interface OgImageTemplateProps {
  title: string;
  description: string;
}

export function generateOgImageSvg({ title, description }: OgImageTemplateProps): string {
  // Escapar caracteres especiales para SVG
  const escapeXml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Función para dividir texto largo en múltiples líneas
  const wrapText = (text: string, maxLength: number = 40) => {
    if (text.length <= maxLength) return [text];
    
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  const titleLines = wrapText(title, 35);
  const descriptionLines = wrapText(description, 60);

  // Calcular posiciones dinámicamente
  const titleStartY = 280;
  const titleLineHeight = 70;
  const descriptionStartY = titleStartY + (titleLines.length * titleLineHeight) + 40;
  const descriptionLineHeight = 40;

  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradiente de fondo -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a1a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2a2a2a;stop-opacity:1" />
    </linearGradient>
    
    <!-- Gradiente para el logo -->
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffeb0a;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ffd300;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e9ca01;stop-opacity:1" />
    </linearGradient>
    
    <!-- Sombra para el texto -->
    <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)" />
    </filter>
    
    <!-- Estilos CSS dentro del SVG -->
    <style>
      .bg { fill: url(#bgGradient); }
      .title { 
        fill: #ffd300; 
        font-family: 'Arial Black', Arial, sans-serif; 
        font-size: 58px; 
        font-weight: bold; 
        text-anchor: middle; 
        filter: url(#textShadow);
      }
      .description { 
        fill: #ffffff; 
        font-family: Arial, sans-serif; 
        font-size: 28px; 
        text-anchor: middle; 
        opacity: 0.9;
      }
      .logo-umbrella { fill: url(#logoGradient); }
      .logo-handle { fill: #3b280d; }
    </style>
  </defs>
  
  <!-- Fondo con gradiente -->
  <rect width="1200" height="630" class="bg"/>
  
  <!-- Logo del paraguas (versión simplificada pero reconocible) -->
  <g transform="translate(600, 120)">
    <!-- Parte superior del paraguas -->
    <path class="logo-umbrella" d="M-60,0 Q-60,-40 -30,-50 Q0,-60 30,-50 Q60,-40 60,0 Q60,10 30,20 Q0,25 -30,20 Q-60,10 -60,0 Z"/>
    <!-- Detalles del paraguas -->
    <path class="logo-umbrella" d="M-40,-20 Q-20,-35 0,-30 Q20,-35 40,-20" stroke="#ffeb0a" stroke-width="2" fill="none"/>
    <path class="logo-umbrella" d="M-20,-10 Q0,-20 20,-10" stroke="#e9ca01" stroke-width="1.5" fill="none"/>
    <!-- Mango del paraguas -->
    <rect class="logo-handle" x="-3" y="0" width="6" height="40"/>
    <!-- Curva del mango -->
    <path class="logo-handle" d="M3,35 Q15,45 20,50" stroke="#3b280d" stroke-width="6" fill="none" stroke-linecap="round"/>
  </g>
  
  <!-- Título (multilínea si es necesario) -->
  ${titleLines.map((line, index) => 
    `<text x="600" y="${titleStartY + (index * titleLineHeight)}" class="title">${escapeXml(line)}</text>`
  ).join('\n  ')}
  
  <!-- Descripción (multilinea si es necesario) -->
  ${descriptionLines.map((line, index) => 
    `<text x="600" y="${descriptionStartY + (index * descriptionLineHeight)}" class="description">${escapeXml(line)}</text>`
  ).join('\n  ')}
</svg>`;
}
