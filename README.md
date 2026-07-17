# asxentiq

## Objetivo del software

Asxentiq es un software diseñado para apoyar la capacitación de las personas en todos los temas relacionados con la ARL, facilitando el acceso a contenidos formativos, procesos de aprendizaje, seguimiento de actividades y fortalecimiento de la cultura de prevención y seguridad en el trabajo. Su propósito es brindar una herramienta práctica, organizada y eficiente que permita a las empresas gestionar y promover la formación de sus colaboradores en aspectos clave de riesgos laborales, salud ocupacional y cumplimiento normativo.

Monorepo con:

- `backend/`: Laravel API REST con Sanctum y MySQL.
- `frontend/`: Angular standalone con una base limpia y NG Bootstrap.
- `start.sh`: arranque conjunto de ambos servicios.

## Frontend

El frontend ya no depende de una plantilla HTML externa. La interfaz se construye con Angular, Bootstrap 5 y componentes de `@ng-bootstrap/ng-bootstrap`.

## Requisitos

El proyecto puede ejecutarse en Linux local o en un entorno online con puertos expuestos.

Comandos necesarios:

- `php`
- `composer`
- `mysql`
- `node`
- `npm`

## Instalación base en Ubuntu WSL

```bash
sudo apt update
sudo apt install -y php php-cli php-mysql php-xml php-mbstring php-curl php-zip unzip curl mysql-client mysql-server composer nodejs npm
```

Verificación:

```bash
php -v
composer --version
mysql --version
node -v
npm -v
```

## Base de datos MySQL

```sql
CREATE DATABASE asxentiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Credenciales iniciales

- Email: `admin@asxentiq.com`
- Password: `Admin12345*`

## Backend

El backend usa únicamente `backend/.env`. Créalo manualmente con tus valores locales o de despliegue:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3307
DB_DATABASE=asxentiq
DB_USERNAME=root
DB_PASSWORD=1234
```

## Tamaño de peticiones y archivos

El backend valida algunos archivos con límites propios, pero el servidor debe permitir un cuerpo de petición mayor que esos límites.

- Foto de perfil: hasta `100 MB`
- Materiales de capacitación o preguntas: hasta `100 MB`

Si ves `Illuminate\Http\Exceptions\PostTooLargeException`, ajusta al menos estos valores en PHP:

- `post_max_size=128M`
- `upload_max_filesize=128M`

Si publicas con Nginx, también revisa:

- `client_max_body_size 128M;`

Ejemplo de config de Nginx en [deploy/nginx/asxentiq.conf](/home/asus/software/asxentiq/deploy/nginx/asxentiq.conf).

Después de aplicar los cambios, reinicia Nginx y PHP-FPM para que tomen los nuevos límites.

## Inicio rápido

```bash
cd /mnt/d/htdocs/asxentiq
chmod +x start.sh
./start.sh
```

## Inicio en entorno online

Antes de ejecutar el script, exporta las URLs publicas y las credenciales reales de MySQL del servidor:

```bash
export PUBLIC_BACKEND_URL="https://tu-dominio.com"
export PUBLIC_FRONTEND_URL="https://tu-dominio.com"
export DB_HOST="host-mysql"
export DB_PORT="3306"
export DB_DATABASE="asxentiq"
export DB_USERNAME="usuario"
export DB_PASSWORD="password"

./start.sh
```

Opcionalmente puedes cambiar los puertos y hosts de escucha:

```bash
export BACKEND_HOST="0.0.0.0"
export BACKEND_PORT="8000"
export FRONTEND_HOST="0.0.0.0"
export FRONTEND_PORT="4200"
```

`start.sh` ya no fuerza `127.0.0.1:3307` ni credenciales locales si existen variables de entorno. Tambien conserva los valores de `backend/.env` cuando no se exporta una variable equivalente.

## Inicio manual

Backend:

```bash
cd /mnt/d/htdocs/asxentiq/backend
composer install
php artisan key:generate
mysql -h 127.0.0.1 -P 3307 -u root -p1234 -e "CREATE DATABASE IF NOT EXISTS asxentiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

Si todavía no existe `backend/.env`, créalo antes de ejecutar Composer y coloca ahí las variables de conexión, URLs y credenciales del proyecto.

Frontend:

```bash
cd /mnt/d/htdocs/asxentiq/frontend
npm install
npm run start -- --host 127.0.0.1 --port 4200
```

## URLs

- API Laravel: `http://localhost:8000`
- Angular: `http://localhost:4200`
