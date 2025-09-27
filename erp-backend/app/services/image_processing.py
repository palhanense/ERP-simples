from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from fastapi import UploadFile
from PIL import Image

MEDIA_ROOT = Path(__file__).resolve().parent.parent / "data" / "product_photos"
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

WEBP_QUALITY = 85
ALLOWED_CONTENT_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
}


class ImageProcessingError(RuntimeError):
    """Raised when an uploaded image cannot be processed."""


def _path_from_public(public_path: str) -> Path:
    filename = public_path.split("/")[-1]
    return MEDIA_ROOT / filename


async def convert_upload_to_webp(upload: UploadFile, *, prefix: str) -> str:
    """Convert an uploaded image to WEBP and persist it on disk."""
    if upload.content_type not in ALLOWED_CONTENT_TYPES:
        raise ImageProcessingError("Formato de arquivo nao suportado.")

    raw_bytes = await upload.read()
    if not raw_bytes:
        raise ImageProcessingError("Arquivo de imagem vazio.")

    try:
        with Image.open(BytesIO(raw_bytes)) as source:
            if source.mode in {"RGBA", "P"}:
                image = source.convert("RGBA")
            else:
                image = source.convert("RGB")

            buffer = BytesIO()
            image.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
            buffer.seek(0)
    except Exception as exc:  # Pillow may raise multiple exception types
        raise ImageProcessingError("Nao foi possivel processar a imagem enviada.") from exc
    finally:
        await upload.close()

    filename = f"{prefix}-{uuid4().hex}.webp"
    destination = MEDIA_ROOT / filename
    with destination.open("wb") as output:
        output.write(buffer.getvalue())

    return f"/media/products/{filename}"


async def convert_many_to_webp(uploads: Iterable[UploadFile], *, prefix: str) -> list[str]:
    saved_paths: list[str] = []
    try:
        for upload in uploads:
            saved_paths.append(await convert_upload_to_webp(upload, prefix=prefix))
    except Exception:
        for public_path in saved_paths:
            stored = _path_from_public(public_path)
            if stored.exists():
                stored.unlink(missing_ok=True)
        raise
    return saved_paths


def remove_product_photos(paths: Iterable[str]) -> None:
    for public_path in paths:
        if not public_path:
            continue
        try:
            file_path = _path_from_public(public_path)
            if file_path.exists():
                file_path.unlink()
        except OSError:
            continue

