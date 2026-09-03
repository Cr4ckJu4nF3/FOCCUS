import os
import uuid
from fastapi import UploadFile

# Como es un proyecto de presentacion con una BD gratuita y poco
# volumen de archivos, se guarda todo en disco local dentro de
# app/assets/uploads. Si mas adelante migran a S3/GCS, solo hay que
# cambiar esta funcion; el resto del codigo (controllers) no cambia.
BASE_UPLOAD_DIR = os.path.join("app", "assets", "uploads")

EXTENSIONES_GUION = {".pdf", ".docx", ".fdx"}
EXTENSIONES_FOTO = {".jpg", ".jpeg", ".png", ".webp"}


def guardar_archivo(file: UploadFile, subcarpeta: str, extensiones_permitidas: set = None) -> str:
    """Guarda un UploadFile en disco y devuelve la ruta relativa que
    se debe persistir en la BD (columna `archivo` / `archivo_path`)."""

    extension = os.path.splitext(file.filename or "")[1].lower()

    if extensiones_permitidas and extension not in extensiones_permitidas:
        raise ValueError(
            f"Extension '{extension}' no permitida. Permitidas: {', '.join(extensiones_permitidas)}"
        )

    carpeta = os.path.join(BASE_UPLOAD_DIR, subcarpeta)
    os.makedirs(carpeta, exist_ok=True)

    nombre_unico = f"{uuid.uuid4().hex}{extension}"
    ruta_completa = os.path.join(carpeta, nombre_unico)

    with open(ruta_completa, "wb") as buffer:
        buffer.write(file.file.read())

    # Ruta relativa (sirve para exponerla luego via un endpoint estatico)
    return os.path.join("uploads", subcarpeta, nombre_unico).replace("\\", "/")
