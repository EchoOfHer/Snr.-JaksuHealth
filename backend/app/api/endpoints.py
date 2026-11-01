from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image, UnidentifiedImageError, ImageFilter
import io
import base64
import math
import numpy as np
import traceback
from scipy.ndimage import label

# Import inference service and constants
from services.inference import (
    SegformerPredictor,
    MODEL_WEIGHTS_PATH,
    CLASS_INFO,
    CLASSES,
    NUM_CLASSES,
)

router = APIRouter()

# ---------------------------------------------------------
# 1. Model Initialization
# ---------------------------------------------------------
print("Loading Model ...")
try:
    predictor = SegformerPredictor(MODEL_WEIGHTS_PATH)
    MODEL_READY = True
    print("Model is ready.")
except Exception as e:
    predictor = None
    MODEL_READY = False
    print(f"Model loading error: {e}")
    traceback.print_exc()


# ---------------------------------------------------------
# 2. Server Health Check
# ---------------------------------------------------------
@router.get("/status")
def get_system_status():
    """Checking Server and Model health"""
    if MODEL_READY and predictor is not None:
        return {"status": "ok", "message": "API and Model are ready!"}
    else:
        raise HTTPException(status_code=503, detail="Server is ready but Model is unavailable")


# ---------------------------------------------------------
# 3. Prediction Endpoint
# ---------------------------------------------------------
@router.post("/predict")
async def predict_lesion(
    file: UploadFile = File(...),
    input_type: str = Form("raw_fundus"),
):
    """
    SegFormer-B5 multi-label retinal lesion segmentation.
    Supports input_type:
      - 'raw_fundus': original fundus photograph requiring complete PreTrain pipeline
      - 'preprocessed': image already processed by PreTrain pipeline (no double enhancement)
    """
    if not MODEL_READY or predictor is None:
        raise HTTPException(status_code=503, detail="Model is not ready or failed to load")

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not an image")

    # Normalize input_type
    clean_input_type = input_type.strip().lower()
    if clean_input_type not in ["raw_fundus", "preprocessed"]:
        clean_input_type = "raw_fundus"

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))

        # Extract deep metadata (TIFF tags and EXIF)
        metadata = {}
        if hasattr(image, "tag_v2"):
            from PIL.TiffTags import TAGS
            for tag_id, value in image.tag_v2.items():
                tag_name = TAGS.get(tag_id, f"Unknown_Tag_{tag_id}")
                if tag_name not in ["StripOffsets", "StripByteCounts", "TileOffsets", "TileByteCounts"]:
                    metadata[tag_name] = str(value)
        elif hasattr(image, "_getexif") and image._getexif() is not None:
            from PIL.ExifTags import TAGS
            for tag_id, value in image._getexif().items():
                tag_name = TAGS.get(tag_id, tag_id)
                metadata[tag_name] = str(value)

        for k, v in image.info.items():
            if k not in metadata and not isinstance(v, bytes):
                metadata[str(k)] = str(v)

        image_rgb = image.convert("RGB")

    except UnidentifiedImageError:
        raise HTTPException(status_code=400, detail="Cannot read or identify image file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image reading error: {str(e)}")

    try:
        # 1. Run AI Inference Pipeline
        mask_orig, global_confidence, extra = predictor.predict(
            image_rgb,
            input_type=clean_input_type
        )
        mask_512 = extra["mask_512"]
        transform_info = extra["transform_info"]

        # ---------------------------------------------------------
        # 2. Optic Disc Calibration (1.8 mm assumed physical diameter)
        # ---------------------------------------------------------
        od_mask_orig = mask_orig[0]
        od_pixels_orig = int(od_mask_orig.sum())

        od_mask_512 = mask_512[0]
        od_pixels_512 = int(od_mask_512.sum())

        if od_pixels_orig > 0:
            # Optic disc detected in original image coordinates
            d_px = math.sqrt(4 * od_pixels_orig / math.pi)
            mm_per_pixel = 1.8 / d_px
            mm_conversion_approximate = False
            calibration_source = "optic_disc"
        elif od_pixels_512 > 0:
            # Optic disc detected in 512x512 space
            d_px_512 = math.sqrt(4 * od_pixels_512 / math.pi)
            mm_per_pixel = 1.8 / d_px_512
            mm_conversion_approximate = False
            calibration_source = "optic_disc_512"
        else:
            # Fallback when optic disc is not detected.
            # 96 DPI is marked as approximate and NOT clinically calibrated.
            dpi_info = image.info.get('dpi') or (96, 96)
            dpi = dpi_info[0] if isinstance(dpi_info, (list, tuple)) else dpi_info
            mm_per_pixel = 25.4 / dpi if dpi else 0.0
            mm_conversion_approximate = True
            calibration_source = "uncalibrated_fallback_96dpi"

        # ---------------------------------------------------------
        # 3. Biomarker Quantification
        # ---------------------------------------------------------
        total_pixels_512 = 512 * 512
        total_pixels_orig = mask_orig.shape[1] * mask_orig.shape[2]

        lesions = []
        findings = {}

        for class_idx, info in CLASS_INFO.items():
            # Strict unblurred binary masks
            bin_mask_orig = mask_orig[class_idx]
            bin_mask_512 = mask_512[class_idx]

            pixels_orig = int(bin_mask_orig.sum())
            pixels_512 = int(bin_mask_512.sum())

            # Connected component labeling in original coordinates
            labeled_orig, n_features_orig = label(bin_mask_orig)
            count = int(n_features_orig)

            # Area percentage in model coordinates (matches training benchmark)
            area_pct_512 = (pixels_512 / total_pixels_512 * 100) if total_pixels_512 else 0.0
            area_pct_orig = (pixels_orig / total_pixels_orig * 100) if total_pixels_orig else 0.0

            # Largest connected lesion and equivalent diameter
            if n_features_orig > 0:
                sizes_orig = np.bincount(labeled_orig.ravel())[1:]
                largest_px_orig = int(sizes_orig.max())
                equiv_diam_px = math.sqrt(4 * largest_px_orig / math.pi)
                max_mm = round(equiv_diam_px * mm_per_pixel, 2) if mm_per_pixel else 0.0
            else:
                largest_px_orig = 0
                max_mm = 0.0

            lesions.append({
                "type": info["name"],
                "color": f"#{info['color'][0]:02X}{info['color'][1]:02X}{info['color'][2]:02X}",
                "count": count,
                # area_percentage formatted for backward compatibility with frontend
                "area_percentage": round(area_pct_512, 2),
                "area_percentage_512": round(area_pct_512, 4),
                "area_percentage_orig": round(area_pct_orig, 4),
                "pixel_count_512": pixels_512,
                "pixel_count_orig": pixels_orig,
                "largest_component_px_orig": largest_px_orig,
                "max_mm": max_mm,
            })

            if pixels_orig > 0:
                findings[info["name"]] = pixels_orig

        # ---------------------------------------------------------
        # 4. Create Visual Mask Overlay (Soft blurred edge for UI rendering only)
        # ---------------------------------------------------------
        img_rgba = image_rgb.convert("RGBA")
        overlay_layer = Image.new("RGBA", img_rgba.size, (0, 0, 0, 0))

        for class_idx, info in CLASS_INFO.items():
            # OpticDisc and Macula have alpha=0 so they are not rendered on the overlay
            if info["color"][3] == 0:
                continue

            sample_mask = mask_orig[class_idx]
            if sample_mask.sum() > 0:
                # Binary mask for visual rendering
                mask_img = Image.fromarray((sample_mask * 255).astype(np.uint8), mode='L')
                # Blur only visual overlay layer to eliminate jagged edges on UI display
                blurred_mask = mask_img.filter(ImageFilter.GaussianBlur(radius=3))
                color_layer = Image.new("RGBA", img_rgba.size, info["color"])
                disease_layer = Image.composite(color_layer, Image.new("RGBA", img_rgba.size, (0, 0, 0, 0)), blurred_mask)
                overlay_layer = Image.alpha_composite(overlay_layer, disease_layer)

        blended_image = Image.alpha_composite(img_rgba, overlay_layer).convert("RGB")

        # Encode blended image to PNG Base64
        buffered = io.BytesIO()
        blended_image.save(buffered, format="PNG")
        base64_string = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return {
            "status": "success",
            "findings": findings,
            "lesions": lesions,
            "confidence": global_confidence,
            "mm_conversion_approximate": mm_conversion_approximate,
            "calibration": {
                "source": calibration_source,
                "is_approximate": mm_conversion_approximate,
                "optic_disc_pixels": od_pixels_orig,
                "mm_per_pixel": round(mm_per_pixel, 6) if mm_per_pixel else None,
            },
            "spatial_correspondence": {
                "input_type": transform_info.get("input_type"),
                "model_coordinate_system": [512, 512],
                "original_dimensions": [image_rgb.height, image_rgb.width],
                "crop_bbox": transform_info.get("crop_bbox"),
            },
            "metadata": metadata,
            "mask_base64": base64_string,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
