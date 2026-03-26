"""
Image Upload Endpoint
Accepts multipart file uploads and stores them in Supabase Storage.
Returns the public URL of the uploaded file.
"""
import uuid
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from app.core.supabase import get_supabase_admin
from app.core.config import settings
from app.middleware.auth_secure import get_current_user

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_BUCKETS = {"menu-images", "room-images"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

EXTENSION_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    bucket: str = Form("menu-images"),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an image to Supabase Storage.
    - bucket: 'menu-images' or 'room-images'
    Returns { url: string }
    """
    if bucket not in ALLOWED_BUCKETS:
        raise HTTPException(status_code=400, detail=f"Invalid bucket. Choose from: {', '.join(ALLOWED_BUCKETS)}")

    content_type = file.content_type or ""
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="File must be a JPEG, PNG, WebP, or GIF image")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit")

    # Build a unique storage path
    ext = EXTENSION_MAP.get(content_type, ".jpg")
    filename = f"{uuid.uuid4().hex}{ext}"

    try:
        supabase = get_supabase_admin()
        supabase.storage.from_(bucket).upload(
            path=filename,
            file=contents,
            file_options={"content-type": content_type, "upsert": "false"},
        )
    except Exception as e:
        error_msg = str(e)
        # If file already exists (shouldn't happen with UUID, but just in case)
        if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
            raise HTTPException(status_code=409, detail="File already exists")
        raise HTTPException(status_code=500, detail=f"Upload failed: {error_msg}")

    # Build public URL
    public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}"
    return {"url": public_url}


@router.delete("/image")
async def delete_image(
    url: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete an image from Supabase Storage by its public URL.
    Only managers/admins should call this.
    """
    role = current_user.get("role", "")
    if role not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    # Parse bucket and path from URL
    # Expected format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{filename}
    try:
        parts = url.split("/storage/v1/object/public/", 1)
        if len(parts) != 2:
            raise ValueError("Unexpected URL format")
        bucket_and_path = parts[1]
        bucket, filename = bucket_and_path.split("/", 1)
        if bucket not in ALLOWED_BUCKETS:
            raise ValueError("Unknown bucket")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image URL")

    try:
        supabase = get_supabase_admin()
        supabase.storage.from_(bucket).remove([filename])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

    return {"deleted": True}
