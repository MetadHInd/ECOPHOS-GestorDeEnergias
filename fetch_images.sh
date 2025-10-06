#!/usr/bin/env bash
set -euo pipefail

# Carpeta de destino (ajústala si tu estructura cambia)
DEST="frontend/img"
mkdir -p "$DEST"

# Mapa archivo => búsqueda en Unsplash Source (libre de uso)
declare -A IMAGES=(
  [hero-wind.jpg]="https://source.unsplash.com/1600x900/?wind,turbine,windfarm"
  [solar-roof.jpg]="https://source.unsplash.com/1600x900/?solar,rooftop,photovoltaic"
  [hydro-plant.jpg]="https://source.unsplash.com/1600x900/?hydropower,dam,water"
  [battery-storage.jpg]="https://source.unsplash.com/1600x900/?battery,energy,storage"
  [team-lab.jpg]="https://source.unsplash.com/1600x900/?engineering,team,lab"
  [consulting.jpg]="https://source.unsplash.com/1600x900/?consulting,business,meeting"
  [community.jpg]="https://source.unsplash.com/1600x900/?community,people,sun"
  [news-default.jpg]="https://source.unsplash.com/1600x900/?renewable,energy,landscape"
)

echo "⬇️  Descargando imágenes en $DEST"
for name in "${!IMAGES[@]}"; do
  url="${IMAGES[$name]}"
  echo " - $name"
  # -L sigue redirecciones, -s silencioso, -S muestra errores
  curl -L -s -S "$url" -o "$DEST/$name"
done

# --------- Opcional: generar variantes responsivas si está ImageMagick ---------
if command -v magick >/dev/null 2>&1; then
  echo "🪄 Generando variantes sm/md (ImageMagick)"
  for f in "$DEST"/*.jpg; do
    base="$(basename "$f" .jpg)"
    # sm ~800x450, md ~1200x675 manteniendo proporción
    magick "$f" -resize "800x450^"  -gravity center -extent 800x450  "$DEST/${base}-sm.jpg"
    magick "$f" -resize "1200x675^" -gravity center -extent 1200x675 "$DEST/${base}-md.jpg"
  done
else
  echo "ℹ️  ImageMagick no encontrado. Saltando variantes sm/md."
  echo "    Instálalo si quieres:  macOS: brew install imagemagick | Ubuntu: sudo apt-get install imagemagick"
fi

echo "✅ Listo."
