import { defineMiddleware } from 'astro:middleware';
import { bezpecnostniHlavicky } from './lib/bezpecnost/hlavicky';

export const onRequest = defineMiddleware(async (_context, next) => {
  const odpoved = await next();
  // Vývoj potřebuje vložené skripty a WebSocket Vite.
  if (import.meta.env.DEV) return odpoved;
  const zabezpecena = new Response(odpoved.body, odpoved);
  for (const [nazev, hodnota] of Object.entries(bezpecnostniHlavicky)) zabezpecena.headers.set(nazev, hodnota);
  return zabezpecena;
});
