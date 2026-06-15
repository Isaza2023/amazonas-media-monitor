import os

def compile_standalone():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    index_path = os.path.join(base_dir, "frontend", "index.html")
    styles_path = os.path.join(base_dir, "frontend", "styles.css")
    demo_data_path = os.path.join(base_dir, "frontend", "data", "demo-data.js")
    app_path = os.path.join(base_dir, "frontend", "app.js")

    if not all(os.path.exists(p) for p in [index_path, styles_path, demo_data_path, app_path]):
        print("ERROR: Faltan archivos fuentes en el directorio /frontend.")
        return

    print("Leyendo archivos fuente...")
    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    with open(styles_path, "r", encoding="utf-8") as f:
        css = f.read()

    with open(demo_data_path, "r", encoding="utf-8") as f:
        demo = f.read()

    with open(app_path, "r", encoding="utf-8") as f:
        app_code = f.read()

    print("Inyectando estilos y scripts en el HTML...")
    # Reemplazar enlace de estilos externo por estilos incrustados
    html = html.replace('<link rel="stylesheet" href="styles.css">', f'<style>\n{css}\n</style>')

    # Reemplazar referencias a scripts externos por scripts incrustados
    html = html.replace('<script src="data/demo-data.js"></script>', f'<script>\n{demo}\n</script>')
    html = html.replace('<script src="app.js"></script>', f'<script>\n{app_code}\n</script>')

    out_path = os.path.join(base_dir, "index_standalone.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"EXITO: Dashboard independiente compilado correctamente en: {out_path}")
    print("Ya puedes enviar únicamente este archivo index_standalone.html a tus directivos.")

if __name__ == "__main__":
    compile_standalone()
