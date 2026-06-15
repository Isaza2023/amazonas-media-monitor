# Dashboard Profesional de Monitoreo de Medios y Redes Sociales - Amazonas Colombia

Este sistema es una solución integral y profesional de monitoreo de medios digitales, comunicados oficiales, boletines de prensa, videos de YouTube y reportes de redes sociales de fuentes abiertas (OSINT). Está orientado específicamente al análisis de orden público, seguridad, criminalidad, minería ilegal, deforestación, transporte fluvial, migración, eventos fronterizos (frontera con Brasil y Perú) y gobernabilidad del **Departamento del Amazonas, Colombia**.

Diseñado para uso institucional por analistas judiciales de la **Dirección Seccional Amazonas - Sección de Policía Judicial CTI**.

---

## 🚀 Inicio Rápido (En Windows)

El proyecto incluye un script de lanzamiento automático en Windows (`run.bat`) que configura el entorno virtual, instala las dependencias de Python y arranca el servidor web.

1. Navegue al directorio del proyecto:
   `C:\windows\Temp\amazonas_media_monitor`
2. Haga **doble clic** en el archivo **`run.bat`** (o ejecútelo desde la consola).
3. Espere a que finalice la instalación de las dependencias. La aplicación se abrirá automáticamente en su navegador en la dirección:
   👉 **`http://127.0.0.1:8000/`**

---

## 📁 Estructura del Proyecto

El código está organizado de forma modular por carpetas:

```text
amazonas_media_monitor/
│
├── backend/
│   ├── connectors/                  # Conectores de fuentes de información
│   │   ├── rss_connector.py         # Google News RSS y medios digitales
│   │   ├── gdelt_connector.py       # API de GDELT Project (noticias globales)
│   │   ├── youtube_connector.py     # RSS de canales oficiales y búsqueda de videos
│   │   ├── social_connector.py      # Estructura e integración de X, FB, IG, TikTok
│   │   └── institutional_connector.py# Boletines oficiales (CTI, Policía, Alcaldía)
│   │
│   ├── config.py                    # Carga de .env, palabras clave y canales RSS
│   ├── database.py                  # Modelos SQLAlchemy y sesión (SQLite/PostgreSQL)
│   ├── main.py                      # Servidor FastAPI, API REST y planificador en segundo plano
│   ├── report_generator.py          # Lógica de exportación de reportes (Word, PDF, Excel)
│   ├── utils.py                     # Análisis de texto, KWs, relevancia y alertas
│   └── requirements.txt             # Librerías de Python requeridas
│
├── database/                        # Almacenamiento de base de datos
│   └── media_monitor.db             # Archivo SQLite local auto-generado
│
├── frontend/                        # Interfaz gráfica (Single Page Application)
│   ├── index.html                   # Estructura del panel principal de monitoreo
│   ├── styles.css                   # Estilos premium (Modo oscuro/claro, Glassmorphism)
│   └── app.js                       # Control de UI, gráficos Chart.js y peticiones API
│
├── .env                             # Variables de entorno y tokens de API (activo)
├── .env.example                     # Plantilla de variables de entorno
└── run.bat                          # Ejecutable automático para Windows
```

---

## 🛠️ Instalación y Configuración Manual

Si prefiere arrancar el proyecto de manera manual por consola de comandos:

### Paso 1: Clonar/Copiar los archivos en una carpeta de trabajo
Asegúrese de contar con Python 3.8 o superior instalado en su máquina.

### Paso 2: Crear y Activar el Entorno Virtual (Venv)
```bash
python -m venv venv
# En Windows:
call venv\Scripts\activate
# En Linux/macOS:
source venv/bin/activate
```

### Paso 3: Instalar las Dependencias
```bash
pip install -r backend/requirements.txt
```

### Paso 4: Ejecutar el Servidor FastAPI
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Abra en su navegador la URL: `http://127.0.0.1:8000/`

---

## ⚙️ Configuración de Credenciales de API

Por defecto, el sistema viene preparado con conectores públicos y datos simulados/mocks de alta calidad específicos de Leticia y Tabatinga para que el dashboard sea interactivo de inmediato sin necesidad de llaves de API.

Si desea habilitar el monitoreo oficial con cuentas empresariales o de desarrollador:
1. Vaya a la pestaña **Configuración** en la barra lateral del dashboard.
2. Ingrese los tokens correspondientes en el formulario:
   * **YouTube Data API v3 Key**: Habilita búsquedas en vivo por palabras clave en YouTube.
   * **X/Twitter Bearer Token (v2)**: Habilita descargas de tweets públicos en tiempo real.
   * **Facebook Graph Access Token**: Habilita lectura de páginas públicas en Facebook.
   * **Instagram Graph Access Token**: Habilita lectura de perfiles públicos.
3. Pulse **Guardar Llaves de API**. El sistema guardará de forma segura las llaves en la base de datos local y se enmascararán para su visualización.
4. Alternativamente, puede rellenar las variables de entorno directamente en el archivo `.env` en el directorio raíz.

---

## 📊 Características y Módulos del Sistema

### 1. Panel de Estadísticas (Dashboard Principal)
* **KPIs Rápidos**: Total de noticias monitoreadas, nuevas noticias por revisar, alertas críticas activas y menciones en zonas de frontera.
* **Gráficos Interactivos (Chart.js)**: Tendencia temporal de publicaciones, distribución de temas, menciones geográficas por municipio/zona, porcentaje de relevancia y fuentes con más publicaciones.
* **Nube de Términos Críticos**: Listado de hashtags de palabras clave recurrentes detectadas.

### 2. Feed de Noticias y Filtros Avanzados
* Barra de búsqueda por palabras clave.
* Filtros rápidos por: Fecha, Nivel de Relevancia (Alta/Media/Baja), Tema Principal, Tipo de Fuente (Noticia, Red Social, Oficial, Video), Municipio/Zona y Estado (Nuevo, Revisado, Importante, Descartado).
* **Edición y Análisis de Casos**: Cada noticia cuenta con un botón de edición donde el analista judicial puede agregar:
  * **Análisis Preliminar**.
  * **Posible afectación para el Amazonas colombiano** (Impacto Regional).
  * **Observaciones adicionales** y firma del elaborador.
* Los analistas pueden cambiar manualmente el estado (ej. de "Nuevo" a "Importante" o "Descartado"). Los artículos descartados se mueven de inmediato de la feed principal al histórico.

### 3. Módulo de Alertas Críticas
* Banner superior horizontal de alertas recientes (ticker de texto animado con velocidad fluida).
* Pestaña dedicada con tarjetas animadas con un borde parpadeante rojo de alta visibilidad para identificar incidentes severos de seguridad (Homicidios, Capturas, Narcotráfico, GAO, Accidentes fluviales graves, Incendios forestales).

### 4. Generador de Reporte Flash
* Seleccione una o múltiples noticias en el feed usando las casillas de verificación.
* Diríjase a la pestaña **Reporte Flash** para ver una vista previa interactiva en tiempo real.
* El documento se renderiza siguiendo la estructura judicial oficial:
  ```text
  DIRECCIÓN SECCIONAL AMAZONAS
  SECCIÓN DE POLICÍA JUDICIAL CTI AMAZONAS
  REPORTE FLASH DE MONITOREO DE MEDIOS
  ...
  ```
* Rellene los campos generales del encabezado (Periodo monitoreado y Nombre de quien elabora).
* Genere descargas instantáneas en:
  * **PDF** (`fpdf2` incorporado en backend, o imprima directamente desde el navegador con `Ctrl+P` ya que cuenta con hojas de estilo CSS optimizadas para impresión).
  * **Word** (`python-docx` que descarga un archivo `.docx` limpio y con las tablas de texto formateadas).
  * **Excel / CSV / JSON** (`pandas` que descarga un archivo plano ideal para integraciones en otros sistemas criminalísticos).

---

## 🗄️ Migración a Base de Datos PostgreSQL

El sistema utiliza SQLite local por defecto para facilitar la portabilidad en cualquier máquina. Para migrar a un servidor de base de datos PostgreSQL de producción:

1. Instale el adaptador de Postgres en el entorno virtual:
   ```bash
   pip install psycopg2-binary
   ```
2. Abra el archivo `.env` y reemplace la variable de entorno `DATABASE_URL` con sus datos de conexión:
   ```text
   DATABASE_URL=postgresql://usuario_cti:mi_contraseña@servidor_ip:5432/bd_monitoreo
   ```
3. Reinicie el servidor FastAPI. SQLAlchemy creará de forma automática las tablas y esquemas necesarios en la base de datos PostgreSQL sin necesidad de migraciones manuales.
