@echo off
cd /d %~dp0
title Lanzador - Dashboard de Monitoreo Amazonas
color 0B

echo =========================================================================
echo       SISTEMA DE MONITOREO DE MEDIOS - DEPARTAMENTO DEL AMAZONAS
echo                   SECCIÓN POLICÍA JUDICIAL CTI
echo =========================================================================
echo.

:: 1. Comprobar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 goto err_nopython

:: 2. Crear entorno virtual si no existe
if not exist "venv" goto venv_create
echo [1/3] Entorno virtual existente detectado.
goto venv_ready

:venv_create
echo [1/3] Creando entorno virtual Python (venv)...
python -m venv venv
if errorlevel 1 goto err_venv
goto venv_ready

:venv_ready
:: 3. Activar entorno virtual e instalar requerimientos
echo.
echo [2/3] Activando venv e instalando dependencias de requirements.txt...
call venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
if errorlevel 1 goto err_reqs

:: 4. Abrir el dashboard en el navegador por defecto
echo.
echo [3/3] Iniciando servidor FastAPI y abriendo Dashboard...
echo La aplicacion estara disponible localmente en: http://127.0.0.1:8080/
echo Y en la red local usando la IP de este equipo (ej: http://192.168.X.X:8080/)
start http://127.0.0.1:8080/

:: 5. Iniciar Uvicorn
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8080 --reload
if errorlevel 1 goto err_server
goto eof

:err_nopython
color 0C
echo ERROR: Python no esta instalado o no se encuentra en el PATH del sistema.
echo Por favor instale Python 3.8 o superior y vuelva a intentarlo.
pause
exit /b 1

:err_venv
color 0C
echo ERROR: No se pudo crear el entorno virtual de Python.
pause
exit /b 1

:err_reqs
color 0C
echo ERROR: Error al instalar las dependencias de Python listadas en requirements.txt.
pause
exit /b 1

:err_server
color 0C
echo.
echo ERROR: El servidor se ha detenido inesperadamente.
pause
exit /b 1

:eof
