"""
JaksuHealth — SegFormer-B5 Retinal Inference Service
Aligned with training and benchmarking preprocessing:
- PreTrain pipeline: auto-crop (threshold=7), square pad, 512x512 INTER_CUBIC,
  LAB illumination correction (median blur 45), CLAHE (clipLimit=2.0, tileGridSize=(8,8)).
- Strict ImageNet normalization: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225].
- Multi-label independent channel segmentation: 5 classes, Sigmoid, threshold 0.5.
- Inverse spatial mapping preserving original photograph coordinates.
"""

import os
import math
import numpy as np
import cv2
from PIL import Image, ImageFilter
import torch
import torch.nn.functional as F
from transformers import SegformerConfig, SegformerForSemanticSegmentation

# ------------------------------------------------------------
# Configuration & Constants
# ------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_WEIGHTS_PATH = os.path.join(BASE_DIR, 'model', 'SegFormer_best_model.pth')

NUM_CLASSES = 5
IMAGE_SIZE = (512, 512)

# Verified 5-channel order matching training dataset and Kaggle benchmark
CLASSES = ["OpticDisc", "Macula", "Exudates", "Hemorrhages", "Drusen"]

CLASS_INFO = {
    0: {"name": "OpticDisc", "color": (0, 0, 255, 0)},      # Blue (Alpha=0, hidden from overlay)
    1: {"name": "Macula", "color": (0, 255, 0, 0)},         # Green (Alpha=0, hidden from overlay)
    2: {"name": "Exudates", "color": (0, 255, 0, 191)},     # Green (75% opacity)
    3: {"name": "Hemorrhages", "color": (0, 0, 255, 191)},  # Blue (75% opacity)
    4: {"name": "Drusen", "color": (255, 0, 255, 191)},     # Magenta (75% opacity)
}

# ImageNet normalization parameters (matching training alb.Normalize / torchvision)
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def auto_crop_fundus(img_rgb: np.ndarray) -> tuple[np.ndarray, tuple[int, int, int, int]]:
    """
    Remove dark background using Grayscale Thresholding and Contour Detection.
    Matches step03_preprocessing.ipynb auto_crop_fundus reference.
    Returns: (cropped_img, (x, y, w, h))
    """
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 7, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return img_rgb, (0, 0, img_rgb.shape[1], img_rgb.shape[0])

    c = max(contours, key=cv2.contourArea)
    x, y, w, h = cv2.boundingRect(c)
    cropped_img = img_rgb[y:y+h, x:x+w]
    return cropped_img, (x, y, w, h)


def pad_to_square(cropped_img: np.ndarray) -> tuple[np.ndarray, tuple[int, int, int, int], int]:
    """
    Apply symmetric square padding to match step03_preprocessing.ipynb.
    Returns: (padded_img, (pad_top, pad_bottom, pad_left, pad_right), max_side)
    """
    h, w = cropped_img.shape[:2]
    max_side = max(h, w)
    pad_top = (max_side - h) // 2
    pad_bottom = (max_side - h) - pad_top
    pad_left = (max_side - w) // 2
    pad_right = (max_side - w) - pad_left

    padded_img = cv2.copyMakeBorder(
        cropped_img,
        pad_top,
        pad_bottom,
        pad_left,
        pad_right,
        cv2.BORDER_CONSTANT,
        value=[0, 0, 0]
    )
    return padded_img, (pad_top, pad_bottom, pad_left, pad_right), max_side


def correct_illumination_and_clahe(img_rgb: np.ndarray) -> np.ndarray:
    """
    Apply illumination correction (median blur 45 subtraction + mean restoration)
    and CLAHE enhancement on the L channel of LAB color space.
    Matches step03_preprocessing.ipynb reference implementation.
    """
    lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)

    # 1. Illumination Correction (even out background lighting)
    l_float = l.astype(np.float32)
    bg = cv2.medianBlur(l, 45).astype(np.float32)
    corrected_l = l_float - bg + np.mean(l_float)
    corrected_l = np.clip(corrected_l, 0, 255).astype(np.uint8)

    # 2. CLAHE Enhancement (improve local contrast)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(corrected_l)

    # 3. Merge channels back and return RGB
    enhanced_lab = cv2.merge((enhanced_l, a, b))
    enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)
    return enhanced_rgb


class SegformerPredictor:
    def __init__(self, model_path: str = None, device: str = None):
        """
        Load SegFormer-B5 architecture and pretrained weights strictly matching benchmark.
        """
        self.model_path = model_path or MODEL_WEIGHTS_PATH
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')

        # Load official B5 config with offline fallback
        try:
            config = SegformerConfig.from_pretrained(
                'nvidia/segformer-b5-finetuned-ade-640-640',
                num_labels=NUM_CLASSES
            )
        except Exception:
            config = SegformerConfig(
                num_labels=NUM_CLASSES,
                num_channels=3,
                depths=[3, 6, 40, 3],
                hidden_sizes=[64, 128, 320, 512],
                decoder_hidden_size=768,
                num_attention_heads=[1, 2, 5, 8],
                sr_ratios=[8, 4, 2, 1],
                patch_sizes=[7, 3, 3, 3],
                strides=[4, 2, 2, 2],
                mlp_ratios=[4, 4, 4, 4],
            )

        self.model = SegformerForSemanticSegmentation(config)
        state_dict = torch.load(self.model_path, map_location=self.device, weights_only=True)
        if isinstance(state_dict, dict) and 'model_state_dict' in state_dict:
            state_dict = state_dict['model_state_dict']
        elif isinstance(state_dict, dict) and 'state_dict' in state_dict:
            state_dict = state_dict['state_dict']
        if all(k.startswith('module.') for k in state_dict):
            state_dict = {k[len('module.'):]: v for k, v in state_dict.items()}

        self.model.load_state_dict(state_dict, strict=True)
        self.model.to(self.device).eval()

    def preprocess_image(
        self,
        image: Image.Image | np.ndarray,
        input_type: str = "raw_fundus"
    ) -> tuple[torch.Tensor, dict]:
        """
        Preprocess fundus image for SegFormer-B5:
        - raw_fundus: full PreTrain pipeline (auto-crop, square pad, 512x512 INTER_CUBIC,
          illumination correction, CLAHE, ImageNet normalization).
        - preprocessed: image already processed by PreTrain; resize to 512x512 if needed,
          then apply ImageNet normalization only (no double enhancement).
        """
        if isinstance(image, Image.Image):
            img_rgb = np.array(image.convert("RGB"))
        else:
            img_rgb = np.array(image)
            if img_rgb.ndim == 2:
                img_rgb = cv2.cvtColor(img_rgb, cv2.COLOR_GRAY2RGB)
            elif img_rgb.shape[2] == 4:
                img_rgb = cv2.cvtColor(img_rgb, cv2.COLOR_RGBA2RGB)

        orig_h, orig_w = img_rgb.shape[:2]

        if input_type == "preprocessed":
            # Image already preprocessed by PreTrain pipeline
            if (orig_h, orig_w) != IMAGE_SIZE:
                resized = cv2.resize(img_rgb, IMAGE_SIZE, interpolation=cv2.INTER_CUBIC)
            else:
                resized = img_rgb
            transform_info = {
                "input_type": "preprocessed",
                "original_size": (orig_h, orig_w),
                "crop_bbox": (0, 0, orig_w, orig_h),
                "padding": (0, 0, 0, 0),
                "max_side": max(orig_h, orig_w),
            }
            enhanced_rgb = resized
        else:
            # Complete raw_fundus pipeline
            cropped, (crop_x, crop_y, crop_w, crop_h) = auto_crop_fundus(img_rgb)
            padded, (pad_top, pad_bottom, pad_left, pad_right), max_side = pad_to_square(cropped)
            resized = cv2.resize(padded, IMAGE_SIZE, interpolation=cv2.INTER_CUBIC)
            enhanced_rgb = correct_illumination_and_clahe(resized)
            transform_info = {
                "input_type": "raw_fundus",
                "original_size": (orig_h, orig_w),
                "crop_bbox": (crop_x, crop_y, crop_w, crop_h),
                "padding": (pad_top, pad_bottom, pad_left, pad_right),
                "max_side": max_side,
            }

        # ImageNet normalization: convert [0, 255] to [0.0, 1.0] and normalize
        img_float = enhanced_rgb.astype(np.float32) / 255.0
        normalized = (img_float - IMAGENET_MEAN) / IMAGENET_STD

        # Shape [1, 3, 512, 512]
        tensor = torch.from_numpy(normalized.transpose(2, 0, 1)).unsqueeze(0).to(self.device)
        return tensor, transform_info

    def inverse_transform_mask(
        self,
        mask_512: np.ndarray,
        transform_info: dict,
        probs_512: np.ndarray = None
    ) -> np.ndarray:
        """
        Map segmentation predictions back to original photograph coordinate system.
        Uses continuous bilinear probability interpolation before thresholding (>0.5)
        to prevent boundary aliasing and maintain sub-pixel centroid accuracy.
        """
        orig_h, orig_w = transform_info["original_size"]

        if transform_info["input_type"] == "preprocessed":
            if (orig_h, orig_w) == IMAGE_SIZE:
                return mask_512.copy()
            # If preprocessed input was not 512x512, resize to its original size
            out_mask = np.zeros((NUM_CLASSES, orig_h, orig_w), dtype=np.uint8)
            for c in range(NUM_CLASSES):
                if probs_512 is not None:
                    p = cv2.resize(probs_512[c], (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
                    out_mask[c] = (p > 0.5).astype(np.uint8)
                else:
                    out_mask[c] = cv2.resize(mask_512[c], (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
            return out_mask

        crop_x, crop_y, crop_w, crop_h = transform_info["crop_bbox"]
        pad_top, pad_bottom, pad_left, pad_right = transform_info["padding"]
        max_side = transform_info["max_side"]

        out_mask = np.zeros((NUM_CLASSES, orig_h, orig_w), dtype=np.uint8)

        for c in range(NUM_CLASSES):
            if probs_512 is not None:
                # Bilinear resize of probabilities to max_side x max_side
                p_padded = cv2.resize(probs_512[c], (max_side, max_side), interpolation=cv2.INTER_LINEAR)
                # Unpad to cropped dimension
                p_crop = p_padded[pad_top : max_side - pad_bottom, pad_left : max_side - pad_right]
                # Threshold at 0.5
                binary_crop = (p_crop > 0.5).astype(np.uint8)
            else:
                m_padded = cv2.resize(mask_512[c], (max_side, max_side), interpolation=cv2.INTER_NEAREST)
                binary_crop = m_padded[pad_top : max_side - pad_bottom, pad_left : max_side - pad_right]

            # Place back into original photograph frame
            out_mask[c, crop_y : crop_y + crop_h, crop_x : crop_x + crop_w] = binary_crop

        return out_mask

    def predict(
        self,
        image: Image.Image | np.ndarray,
        input_type: str = "raw_fundus"
    ) -> tuple[np.ndarray, int, dict]:
        """
        Execute SegFormer-B5 segmentation:
        1. Preprocess according to input_type (raw_fundus or preprocessed).
        2. Perform inference in 512x512 coordinate system.
        3. Bilinear interpolate logits to 512x512 (align_corners=False), Sigmoid, threshold 0.5.
        4. Invert spatial transformation to original photograph coordinates.
        Returns:
            mask_orig: np.ndarray [5, orig_h, orig_w] (binary 0/1)
            global_confidence: int (0-100)
            extra: dict with 512x512 model masks, probabilities, and geometry info
        """
        input_tensor, transform_info = self.preprocess_image(image, input_type=input_type)

        with torch.no_grad():
            outputs = self.model(pixel_values=input_tensor)
            logits = outputs.logits  # [1, 5, 128, 128]

            # Model coordinate space interpolation: exactly 512x512
            logits_512 = F.interpolate(
                logits,
                size=IMAGE_SIZE,
                mode='bilinear',
                align_corners=False
            )
            probs_512 = torch.sigmoid(logits_512).squeeze(0).cpu().numpy()  # [5, 512, 512]
            mask_512 = (probs_512 > 0.5).astype(np.uint8)                    # [5, 512, 512]

        # Invert geometry to match original image dimensions
        mask_orig = self.inverse_transform_mask(mask_512, transform_info, probs_512=probs_512)

        # Global confidence across lesion channels (2=Exudates, 3=Hemorrhages, 4=Drusen)
        disease_classes = [2, 3, 4]
        probs_disease = probs_512[disease_classes, :, :]
        mask_disease = mask_512[disease_classes, :, :]

        if mask_disease.sum() > 0:
            confidence = float(probs_disease[mask_disease == 1].mean()) * 100
        else:
            confidence = float((1 - probs_disease).mean()) * 100

        global_confidence = int(round(confidence))

        extra = {
            "mask_512": mask_512,
            "probs_512": probs_512,
            "transform_info": transform_info,
        }

        return mask_orig, global_confidence, extra
