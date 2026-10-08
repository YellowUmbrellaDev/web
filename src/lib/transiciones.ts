import type { TransitionDirectionalAnimations } from 'astro';

// El contenido sale rápido y el nuevo entra con un pequeño ascenso; la cabecera
// (paraguas, título y botones) no se anima: el navegador la desplaza a su nueva posición.
const salir = { name: 'yu-salir', duration: '0.18s', easing: 'ease-in', fillMode: 'forwards' } as const;
const entrar = { name: 'yu-entrar', duration: '0.5s', delay: '0.12s', easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fillMode: 'backwards' } as const;

export const aparece: TransitionDirectionalAnimations = {
  forwards: { old: salir, new: entrar },
  backwards: { old: salir, new: entrar },
};
