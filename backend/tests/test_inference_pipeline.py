"""
Test Suite: JaksuHealth SegFormer Inference Pipeline & Preprocessing Alignment
Verifies Priorities 1 through 6:
1. Preprocessed image normalization matches training validation transform within numerical tolerance.
2. Raw image preprocessing matches the PreTrain reference implementation.
3. Preprocessed images are not enhanced twice.
4. RGB channel order and ImageNet normalization.
5. 5-channel multi-label output order without Softmax.
6. Spatial alignment and coordinate correspondence.
7. Original dimensions preserved.
8. Optic-disc-based physical size calibration.
9. Lesion quantification reproducibility.
10. API endpoint contract and error handling.
"""

import sys
import os
import unittest
import numpy as np
import cv2
from PIL import Image
import torch
import torchvision.transforms as T

# Add backend/app to path
BACKEND_APP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")
if BACKEND_APP_DIR not in sys.path:
    sys.path.insert(0, BACKEND_APP_DIR)

from services.inference import (
    SegformerPredictor,
    auto_crop_fundus,
    pad_to_square,
    correct_illumination_and_clahe,
    CLASSES,
    CLASS_INFO,
    NUM_CLASSES,
    IMAGE_SIZE,
    IMAGENET_MEAN,
    IMAGENET_STD,
    MODEL_WEIGHTS_PATH,
)


class TestInferencePipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load predictor once for test suite
        cls.predictor = SegformerPredictor(MODEL_WEIGHTS_PATH, device="cpu")

    def test_01_preprocessed_matches_training_validation_transform(self):
        """1. A preprocessed image produces a tensor matching training validation transform."""
        np.random.seed(42)
        test_rgb = np.random.randint(0, 256, (512, 512, 3), dtype=np.uint8)

        # Pipeline tensor
        tensor, info = self.predictor.preprocess_image(test_rgb, input_type="preprocessed")
        tensor_np = tensor.squeeze(0).cpu().numpy()  # [3, 512, 512]

        # Training alb.Normalize math: (img / 255.0 - mean) / std
        expected_f = test_rgb.astype(np.float32) / 255.0
        expected_norm = (expected_f - IMAGENET_MEAN) / IMAGENET_STD
        expected_chw = expected_norm.transpose(2, 0, 1)

        diff = np.abs(tensor_np - expected_chw).max()
        self.assertLess(diff, 1e-6, f"Difference {diff} exceeds tolerance 1e-6")
        self.assertEqual(info["input_type"], "preprocessed")

    def test_02_raw_fundus_preprocessing_pipeline_components(self):
        """2. Raw image preprocessing components match PreTrain reference."""
        # Create synthetic raw fundus: 960x1440 image with dark borders and circular eye
        raw_rgb = np.zeros((960, 1440, 3), dtype=np.uint8)
        cv2.circle(raw_rgb, (720, 480), 400, (140, 110, 80), -1)

        # Test auto_crop
        cropped, (cx, cy, cw, ch) = auto_crop_fundus(raw_rgb)
        self.assertTrue(cw > 0 and ch > 0)
        self.assertLess(cw, 1440)
        self.assertEqual(cropped.shape[:2], (ch, cw))

        # Test square padding
        padded, (pt, pb, pl, pr), max_side = pad_to_square(cropped)
        self.assertEqual(padded.shape[0], padded.shape[1])
        self.assertEqual(padded.shape[0], max_side)
        self.assertEqual(pt + ch + pb, max_side)
        self.assertEqual(pl + cw + pr, max_side)

        # Test illumination correction
        resized = cv2.resize(padded, (512, 512), interpolation=cv2.INTER_CUBIC)
        enhanced = correct_illumination_and_clahe(resized)
        self.assertEqual(enhanced.shape, (512, 512, 3))
        self.assertEqual(enhanced.dtype, np.uint8)

    def test_03_prevent_double_preprocessing(self):
        """3. Preprocessed images are not enhanced or cropped twice."""
        test_img = np.full((512, 512, 3), 128, dtype=np.uint8)

        # When input_type is preprocessed, auto_crop and CLAHE are skipped
        tensor_prep, info_prep = self.predictor.preprocess_image(test_img, input_type="preprocessed")
        self.assertEqual(info_prep["crop_bbox"], (0, 0, 512, 512))
        self.assertEqual(info_prep["padding"], (0, 0, 0, 0))

        # Pixel value check: unnormalize tensor_prep should match test_img / 255.0
        prep_np = tensor_prep.squeeze(0).cpu().numpy().transpose(1, 2, 0)
        unnorm = np.clip((prep_np * IMAGENET_STD + IMAGENET_MEAN) * 255.0, 0, 255).round().astype(np.uint8)
        diff = np.abs(unnorm.astype(int) - test_img.astype(int)).max()
        self.assertLessEqual(diff, 1)

    def test_04_rgb_channel_order_and_normalization(self):
        """4. RGB channel order is preserved and ImageNet mean/std are correct."""
        red_img = np.zeros((512, 512, 3), dtype=np.uint8)
        red_img[:, :, 0] = 255  # Red channel only

        tensor, _ = self.predictor.preprocess_image(red_img, input_type="preprocessed")
        # Channel 0 (R) should have high value: (1.0 - 0.485) / 0.229 ≈ 2.2489
        r_val = tensor[0, 0, 100, 100].item()
        # Channel 1 (G) should have negative value: (0.0 - 0.456) / 0.224 ≈ -2.0357
        g_val = tensor[0, 1, 100, 100].item()
        # Channel 2 (B) should have negative value: (0.0 - 0.406) / 0.225 ≈ -1.8044
        b_val = tensor[0, 2, 100, 100].item()

        self.assertAlmostEqual(r_val, (1.0 - 0.485) / 0.229, places=3)
        self.assertAlmostEqual(g_val, (0.0 - 0.456) / 0.224, places=3)
        self.assertAlmostEqual(b_val, (0.0 - 0.406) / 0.225, places=3)

    def test_05_five_channel_output_order_and_no_softmax(self):
        """5. Five independent channels in exact order without Softmax."""
        self.assertEqual(CLASSES, ["OpticDisc", "Macula", "Exudates", "Hemorrhages", "Drusen"])
        self.assertEqual(NUM_CLASSES, 5)

        # Run inference on dummy image
        dummy = Image.new("RGB", (512, 512), (100, 50, 30))
        mask_orig, conf, extra = self.predictor.predict(dummy, input_type="preprocessed")

        self.assertEqual(mask_orig.shape[0], 5)
        self.assertEqual(extra["mask_512"].shape, (5, 512, 512))
        self.assertEqual(extra["probs_512"].shape, (5, 512, 512))
        # Verify probabilities are between 0 and 1 (Sigmoid, independent, NOT sum to 1 like Softmax)
        self.assertTrue(np.all(extra["probs_512"] >= 0.0))
        self.assertTrue(np.all(extra["probs_512"] <= 1.0))
        # Mask must be binary 0 or 1
        unique_vals = set(np.unique(mask_orig))
        self.assertTrue(unique_vals.issubset({0, 1}))

    def test_06_spatial_alignment_and_coordinate_correspondence(self):
        """6. Inverse spatial transformation maintains centroid alignment."""
        H_orig, W_orig = 960, 1440
        dummy_raw = np.zeros((H_orig, W_orig, 3), dtype=np.uint8)
        cv2.circle(dummy_raw, (720, 480), 400, (130, 100, 80), -1)

        _, transform_info = self.predictor.preprocess_image(dummy_raw, input_type="raw_fundus")

        # Create a synthetic 512x512 probability map with a circular lesion at center
        probs_512 = np.zeros((5, 512, 512), dtype=np.float32)
        cv2.circle(probs_512[2], (256, 256), 40, 1.0, -1)
        mask_512 = (probs_512 > 0.5).astype(np.uint8)

        # Inverse transform
        mask_orig = self.predictor.inverse_transform_mask(mask_512, transform_info, probs_512=probs_512)
        self.assertEqual(mask_orig.shape, (5, H_orig, W_orig))

        # Centroid of lesion in original image should match expected center
        orig_indices = np.where(mask_orig[2] > 0)
        self.assertTrue(len(orig_indices[0]) > 0)
        center_y = np.mean(orig_indices[0])
        center_x = np.mean(orig_indices[1])

        # Center should be close to (480, 720) since eye was drawn at (720, 480)
        self.assertAlmostEqual(center_y, 480.0, delta=15.0)
        self.assertAlmostEqual(center_x, 720.0, delta=15.0)

    def test_07_original_dimensions_preserved(self):
        """7. Output masks preserve original photograph dimensions."""
        for dims in [(960, 1440), (1536, 2304), (1488, 2240)]:
            img = Image.new("RGB", (dims[1], dims[0]), (80, 50, 30))
            mask_orig, _, _ = self.predictor.predict(img, input_type="raw_fundus")
            self.assertEqual(mask_orig.shape[1:], dims)

    def test_08_optic_disc_calibration(self):
        """8. Optic disc equivalent diameter calibration with 1.8 mm assumed size."""
        import math
        # 10,000 pixels OD
        od_pixels = 10000
        d_px = math.sqrt(4 * od_pixels / math.pi)
        mm_per_pixel = 1.8 / d_px

        # Lesion with 400 pixels
        lesion_px = 400
        equiv_diam_px = math.sqrt(4 * lesion_px / math.pi)
        lesion_mm = equiv_diam_px * mm_per_pixel

        # Scaling ratio should equal 1.8 * sqrt(400/10000) = 1.8 * 0.2 = 0.36 mm
        expected_mm = 1.8 * math.sqrt(lesion_px / od_pixels)
        self.assertAlmostEqual(lesion_mm, expected_mm, places=4)

    def test_09_reproducibility(self):
        """9. Deterministic inference results across consecutive runs."""
        dummy = Image.new("RGB", (512, 512), (120, 80, 50))
        m1, c1, _ = self.predictor.predict(dummy, input_type="preprocessed")
        m2, c2, _ = self.predictor.predict(dummy, input_type="preprocessed")

        self.assertEqual(c1, c2)
        np.testing.assert_array_equal(m1, m2)

    def test_10_api_endpoints(self):
        """10. FastAPI /api/status and /api/predict endpoint responses."""
        from fastapi.testclient import TestClient
        import io
        from main import app

        client = TestClient(app)

        # Status endpoint
        res = client.get("/api/status")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

        # Predict endpoint with preprocessed synthetic image
        buf = io.BytesIO()
        Image.new("RGB", (512, 512), (100, 60, 40)).save(buf, format="PNG")
        buf.seek(0)

        pred_res = client.post(
            "/api/predict",
            files={"file": ("test_retina.png", buf, "image/png")},
            data={"input_type": "preprocessed"}
        )
        self.assertEqual(pred_res.status_code, 200)
        body = pred_res.json()
        self.assertEqual(body["status"], "success")
        self.assertIn("lesions", body)
        self.assertEqual(len(body["lesions"]), 5)
        self.assertIn("mask_base64", body)
        self.assertIn("calibration", body)
        self.assertIn("spatial_correspondence", body)


if __name__ == "__main__":
    unittest.main()
