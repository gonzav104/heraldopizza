# Assets originales

Archivos fuente que la aplicación **no** sirve. Están fuera de `public/` para que Vite no los copie al build. Se conservan
intactos para poder regenerar las versiones web.

| Original | Versión web en `public/` | Cómo se generó |
|---|---|---|
| `videos/gemini_generated_video_720ff841.mp4` (1280×720, 24 fps, ~10 s, con audio AAC, 2,3 MB) | `videos/heraldo-video-720p.mp4` (0,9 MB) | `ffmpeg -i gemini_generated_video_720ff841.mp4 -an -c:v libx264 -preset veryslow -tune animation -crf 23 -profile:v high -level 4.0 -pix_fmt yuv420p -r 24 -movflags +faststart -map_metadata -1 heraldo-video-720p.mp4` |
| `images/local/local-heraldo-pizza.webp` (1086×1448, 1,8 MB) | `images/local/local-heraldo-pizza-900.webp` (900×1200) y `-600.webp` (600×800) | `ffmpeg -i local-heraldo-pizza.webp -vf scale=900:-2:flags=lanczos -c:v libwebp -quality 85 -compression_level 6 -preset photo local-heraldo-pizza-900.webp` (y lo mismo con `600`) |
| `images/local/salon-heraldo-pizza.webp` (1402×1122) y `salon-heraldo-pizza-800.webp` | Ninguna: la carta ya no muestra el salón interior | — |

El póster del video (`public/images/hero/heraldo-video-poster-*.webp`) es su último cuadro, exportado desde el navegador.

`ffmpeg` se usa solo como herramienta de desarrollo; no es una dependencia del proyecto.
