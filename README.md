# LTD Higher or Lower

Web app para BBYO Regional LTD: una pantalla host con QR y leaderboard en vivo, y una pantalla mobile para jugar Higher or Lower con comunidades judias por pais.

## Rutas

- `/` o `/host`: pantalla del host con QR y ranking.
- `/play?room=ltd`: juego para participantes.

## Desarrollo

```bash
npm install
npm run dev
```

## Deploy en Vercel

1. Subi este repo a GitHub.
2. Importalo desde Vercel.
3. Build command: `npm run build`.
4. Output directory: `dist`.

El leaderboard funciona con un fallback en memoria para demos, pero en serverless puede reiniciarse. Para usarlo en el evento, agrega Vercel KV al proyecto desde Vercel Storage. Vercel crea automaticamente:

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Con esas variables, los puntajes quedan persistidos entre requests.

## Datos

El juego usa estimaciones estaticas de poblacion judia por pais, inspiradas en los listados de World Jewish Population / American Jewish Year Book compilados por Sergio DellaPergola y resumidos en:

- https://en.wikipedia.org/wiki/Jewish_population_by_country
- https://en.wikipedia.org/wiki/Historical_Jewish_population_by_country

Son valores redondeados para dinamica de juego, no para investigacion academica.
