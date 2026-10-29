# Juegos

Colección de juegos web (HTML estático, sin compilación).

- **Casa de Subasta** (`casa-de-subasta/`): subasta de fútbol, básquetbol o temática libre dirigida por una persona neutral (la casa de subasta). Pujas de 5 segundos, intercambios cada 10 ventas, ruleta cada 15 ventas, votación y ranking final.

## Despliegue

Se publica tal cual en Vercel: importa el repositorio en https://vercel.com/new, sin framework ni comando de build.

### Ranking del analista (IA)

En fútbol y básquetbol, el botón "Pedir ranking al analista" llama a la función `api/ranking.js`, que usa la API de Anthropic. Para activarla:

1. Crea una clave en https://console.anthropic.com (sección API Keys) y añade saldo.
2. En Vercel: proyecto → Settings → Environment Variables → `ANTHROPIC_API_KEY` = tu clave.
3. Vuelve a desplegar (Deployments → Redeploy).

Sin la clave, el juego ofrece el ranking automático por calidad.
