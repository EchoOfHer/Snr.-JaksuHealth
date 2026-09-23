from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image, UnidentifiedImageError, ImageFilter
import io
import base64
import numpy as np
import traceback

# นำเข้า Class AI ของเรามาจาก inference.py
from services.inference import SegformerPredictor, MODEL_WEIGHTS_PATH

router = APIRouter()

# ---------------------------------------------------------
# 1. ระบบโหลดโมเดลพร้อมจัดการ Error (Try-Except)
# ---------------------------------------------------------
print("Loading Model ...")
try:
    predictor = SegformerPredictor(MODEL_WEIGHTS_PATH)
    MODEL_READY = True
    print("Model is ready.")
except Exception as e:
    predictor = None
    MODEL_READY = False
    print(f"Model loading is error: {e}")
    # เก็บ Log ตัวแดงไว้ดูตอน Debug
    traceback.print_exc()

# ---------------------------------------------------------
# 2. API เช็คสถานะเซิร์ฟเวอร์ (Health Check)
# ---------------------------------------------------------
@router.get("/status")
def get_system_status():
    """Checking Server health """
    if MODEL_READY:
        return {"status": "ok", "message": "API and Model are ready!"}
    else:
        # 503 = Service Unavailable (เซิร์ฟเวอร์พังหรือไม่พร้อม)
        raise HTTPException(status_code=503, detail="Server is ready but Model error")

# ---------------------------------------------------------
# 3. API สำหรับทำนายผล (พร้อมดักจับ Error ระหว่างทาง)
# ---------------------------------------------------------
@router.post("/predict")
async def predict_lesion(file: UploadFile = File(...)):
    # ดัก Error ชั้นที่ 1: เช็คว่าโมเดลพร้อมรันไหม?
    if not MODEL_READY:
        raise HTTPException(status_code=503, detail="Model err")

    # ดัก Error ชั้นที่ 2: ตรวจสอบประเภทไฟล์
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File format is not picute")
    
    try:
        # อ่านไฟล์รูปภาพเข้า RAM
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # 🌟 ดึง Metadata แบบเจาะลึก (รองรับ TIFF Tags และ EXIF)
        metadata = {}
        # 1. ลองดึง TIFF Tags (สำหรับไฟล์ .tif)
        if hasattr(image, "tag_v2"):
            from PIL.TiffTags import TAGS
            for tag_id, value in image.tag_v2.items():
                # แปลงรหัสตัวเลขเป็นชื่อ Tag ที่อ่านรู้เรื่อง (เช่น 270 -> ImageDescription)
                tag_name = TAGS.get(tag_id, f"Unknown_Tag_{tag_id}")
                # ข้าม Tag ที่เป็นข้อมูลขยะ (เช่น StripOffsets) เพราะมันยาวมาก
                if tag_name not in ["StripOffsets", "StripByteCounts", "TileOffsets", "TileByteCounts"]:
                    metadata[tag_name] = str(value)
                    
        # 2. ถ้าเป็น JPG/PNG ลองดึง EXIF ปกติ
        elif hasattr(image, "_getexif") and image._getexif() is not None:
            from PIL.ExifTags import TAGS
            for tag_id, value in image._getexif().items():
                tag_name = TAGS.get(tag_id, tag_id)
                metadata[tag_name] = str(value)
                
        # 3. แถมข้อมูลพื้นฐานจาก image.info เข้าไปด้วย
        for k, v in image.info.items():
            if k not in metadata and not isinstance(v, bytes):
                metadata[str(k)] = str(v)
                
        # แปลงภาพให้เป็น RGB
        image_rgb = image.convert("RGB")
        
    except UnidentifiedImageError:
        # ดัก Error ชั้นที่ 3: ไฟล์อาจจะพัง หรือไม่ใช่รูปภาพจริงๆ (แค่เปลี่ยนนามสกุลหลอกมา)
        raise HTTPException(status_code=400, detail="Cannot read the image file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image management is err: {str(e)}")
    
    try:
        # สั่งรันโมเดล AI (ใส่ try-except เผื่อเกิด Error ระหว่างคิด เช่น แรมการ์ดจอเต็ม)
        mask = predictor.predict(image_rgb)
        
        # วาด Overlay 5 คลาส
        CLASS_INFO = {
            0: {"name": "OpticDisc", "color": (0, 0, 255, 191)},
            1: {"name": "Macula", "color": (0, 255, 0, 191)},
            2: {"name": "Exudates", "color": (255, 255, 0, 191)},
            3: {"name": "Hemorrhages", "color": (255, 0, 0, 191)},
            4: {"name": "Drusen", "color": (0, 255, 255, 191)},
        }

        img_rgba = image_rgb.convert("RGBA")
        overlay_layer = Image.new("RGBA", img_rgba.size, (0, 0, 0, 0))
        findings = {}

        for class_idx, info in CLASS_INFO.items():
            sample_mask = mask[class_idx]
            if sample_mask.sum() > 0:
                findings[info['name']] = int(sample_mask.sum())
                mask_img = Image.fromarray((sample_mask * 255).astype(np.uint8), mode='L')
                
                # Apply Gaussian Blur to smooth the edges
                mask_img = mask_img.filter(ImageFilter.GaussianBlur(radius=3))
                
                color_layer = Image.new("RGBA", img_rgba.size, info["color"])
                disease_layer = Image.composite(color_layer, Image.new("RGBA", img_rgba.size, (0, 0, 0, 0)), mask_img)
                overlay_layer = Image.alpha_composite(overlay_layer, disease_layer)

        blended_image = Image.alpha_composite(img_rgba, overlay_layer).convert("RGB")
        
        # แปลงเป็น Base64
        buffered = io.BytesIO()
        blended_image.save(buffered, format="PNG")
        base64_string = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return {
            "status": "success",
            "findings": findings,
            "metadata": metadata,
            "mask_base64": base64_string
        }
        
    except Exception as e:
        # ดัก Error ชั้นที่ 4: Error ระหว่างรันโมเดล (เช่น CUDA Out of Memory หรือบั๊กใน inference.py)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error occurs in calculation process: {str(e)}")


