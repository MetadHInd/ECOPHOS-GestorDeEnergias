Write-Host ">>> Verificando Node/npm..."
node -v
npm -v

Write-Host ">>> Instalando dependencias..."
npm ci 2>$null
if ($LASTEXITCODE -ne 0) { npm install }

Write-Host ">>> Iniciando servidor en modo desarrollo (nodemon)..."
npm run dev
