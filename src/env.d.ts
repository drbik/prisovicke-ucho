/// <reference types="astro/client" />

// Vazby popisují vlastní rozhraní. Typy Workers by se tloukly s typy prohlížeče v src/skripty.
declare module 'cloudflare:workers' {
  export const env: {
    AI: import('./lib/ai/cloudflare').VazbaAi;
    PODANI_RATE_LIMITER: import('./lib/podani/ochrana').Limiter;
    DB: import('./lib/odpovedi/cloudflare').VazbaD1;
    VECTORIZE: import('./lib/odpovedi/cloudflare').VazbaVectorize;
    // Jen lokálně v .dev.vars: stránka běží bez přihlášení ke Cloudflare.
    FALESNE_AI?: string;
  };
}
