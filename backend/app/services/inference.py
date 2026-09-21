import torch
import torch.nn.functional as F
from PIL import Image
import numpy as np
import cv2  # นำเข้า OpenCV สำหรับทำ CLAHE
from transformers import SegformerConfig, SegformerForSemanticSegmentation
import torchvision.transforms as transforms

# ------------------------------------------------------------
# การตั้งค่า (Configuration)
# ------------------------------------------------------------
MODEL_WEIGHTS_PATH = r"D:\Backup\Senior-Project\Jaksu-Demo\backend\model\SegFormer_best_model.pth"
NUM_CLASSES = 5
IMAGE_SIZE = (512, 512)

class SegformerPredictor:
    def __init__(self, model_path: str, device: str = None):
        """
        __init__: ฟังก์ชันนี้จะถูกเรียกเมื่อเราสร้าง Object ของคลาสนี้
        หน้าที่: โหลดโครงสร้างโมเดลและน้ำหนัก (Weights) เข้าสู่ระบบ
        """
        self.device = device if device else ('cuda' if torch.cuda.is_available() else 'cpu')
        
        # 1. สร้างโครงร่างโมเดลจาก Config เปล่าๆ (ป้องกันการดาวน์โหลดไฟล์น้ำหนัก 300MB จากอินเทอร์เน็ต)
        config = SegformerConfig.from_pretrained('nvidia/segformer-b5-finetuned-ade-640-640', num_labels=NUM_CLASSES)
        self.model = SegformerForSemanticSegmentation(config)
        
        # 2. นำไฟล์ .pth ที่เทรนเสร็จแล้วจาก Kaggle มาใส่ในโครงร่างโมเดล
        state_dict = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state_dict)
        self.model.to(self.device).eval()

    def apply_clahe(self, image: Image.Image) -> Image.Image:
        """
        apply_clahe: ฟังก์ชันสำหรับปรับความสว่างแบบแยกส่วน (CLAHE)
        หน้าที่: แปลงภาพต้นฉบับให้มีคอนทราสต์ชัดเจนขึ้น (เหมือนตอนเทรน) โดยไม่ทำให้ภาพรวมสีเพี้ยน
        """
        # แปลง PIL เป็น Numpy
        img_np = np.array(image)
        
        # แปลงเป็นพื้นที่สี LAB (L = ความสว่าง, A/B = ค่าสี) 
        # เราจะทำ CLAHE แค่ที่ความสว่าง เพื่อรักษาสีเดิมไว้
        lab = cv2.cvtColor(img_np, cv2.COLOR_RGB2LAB)
        l_channel, a, b = cv2.split(lab)
        
        # สร้างตัวประมวลผล CLAHE (ClipLimit 2.0, Grid 8x8 เป็นค่ามาตรฐาน)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l_channel)
        
        # นำ L-channel ที่ปรับแล้ว มารวมกับ A,B คืน
        merged_lab = cv2.merge((cl, a, b))
        final_img_np = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2RGB)
        
        return Image.fromarray(final_img_np)

    def preprocess(self, image: Image.Image) -> torch.Tensor:
        """
        preprocess: ฟังก์ชันสำหรับเตรียมข้อมูลก่อนป้อนเข้าโมเดล AI
        หน้าที่: ปรับ CLAHE -> Resize -> แปลงเป็น Tensor -> Normalize
        """
        # 1. สร้างร่างโคลนของรูปภาพ แล้วปรับ CLAHE ก่อนเลย!
        clahe_image = self.apply_clahe(image)
        
        # 2. ปรับขนาดและ Normalize ตามมาตรฐาน ImageNet
        transform = transforms.Compose([
            transforms.Resize(IMAGE_SIZE),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
        # ใส่ unsqueeze(0) เพื่อสร้างมิติ Batch = 1 ให้โมเดล (1, C, H, W)
        input_tensor = transform(clahe_image).unsqueeze(0)
        return input_tensor

    def predict(self, image: Image.Image) -> np.ndarray:
        """
        predict: ฟังก์ชันหลักสำหรับหาตำแหน่งรอยโรค (Inference)
        หน้าที่: รับรูปต้นฉบับ -> เตรียมข้อมูล -> ทำนาย -> คืนค่ากลับเป็น Numpy Array
        """
        # เก็บขนาดต้นฉบับไว้ (PyTorch ใช้ Height x Width)
        original_size = (image.height, image.width)
        
        input_tensor = self.preprocess(image).to(self.device)
        
        # ปิดการคิดคำนวณ Gradient เพื่อประหยัด RAM
        with torch.no_grad():
            outputs = self.model(pixel_values=input_tensor)
            logits = outputs.logits
            
            # The Resolution Trap: ยืดจาก 128x128 กลับไปเป็น "ขนาดต้นฉบับ (Original High-Res)" เลย!
            logits = F.interpolate(
                logits, 
                size=original_size, 
                mode='bilinear', 
                align_corners=False
            )
            
            # แปลงคะแนนดิบเป็นเปอร์เซ็นต์ (Sigmoid) เพราะตอนเทรนเราใช้ BCE Loss 
            probs = torch.sigmoid(logits)
            
            # กรองเอาเฉพาะพิกเซลที่โมเดลมั่นใจเกิน 50%
            prediction = (probs > 0.5).float()
            
            # บีบมิติ Batch ทิ้ง จะได้ Array เปล่าๆ รูปทรง (5, Height, Width)
            mask_array = prediction.squeeze().cpu().numpy()
            
        return mask_array

# ------------------------------------------------------------
# ส่วนสำหรับการรันทดสอบโมเดล (Testing script)
# ------------------------------------------------------------
if __name__ == "__main__":
    import time
    
    # 1. โหลดรูปดิบต้นฉบับ
    test_img_path = r'D:\Backup\Senior-Project\Jaksu-Demo\backend\model\20051212_41169_0400_PP.tif'
    
    try: 
        img = Image.open(test_img_path).convert('RGB')
    except FileNotFoundError:
        print(f"❌ หารูปภาพไม่เจอที่: {test_img_path}")
        exit()
        
    print('กำลังโหลดโมเดลเข้าการ์ดจอ...')
    start_time = time.time()

    # สร้างตัวทำนาย (Predictor)
    predictor = SegformerPredictor(MODEL_WEIGHTS_PATH)

    print(f'โหลดเสร็จใน {time.time()-start_time:.2f} วินาที | ทำงานบน: {predictor.device.upper()}')
    print(f'กำลังสแกนหารอยโรค...')
    
    pred_time = time.time()
    
    # 2. สั่งทำนาย! (ใส่รูปดิบเข้าไปได้เลย เพราะโมเดลจะไปโคลนทำ CLAHE เองข้างใน)
    mask = predictor.predict(img)   
    
    print(f'ทำนายเสร็จแล้วใน {time.time() - pred_time:.2f} วินาที')
    print(f'Mask shape: {mask.shape}') # ควรเป็น (5, 512, 512)

    # 3. นำผลลัพธ์มาแปะทับลงบน "รูปดิบ" (Overlay) แบบ 5 คลาส (Opacity 75%)
    # กำหนดสีและชื่อให้แต่ละคลาส (ค่าสี RGBA: A=191 คือ Opacity 75%)
    CLASS_INFO = {
        0: {"name": "OpticDisc", "color": (0, 0, 255, 191)},      # น้ำเงิน
        1: {"name": "Macula", "color": (0, 255, 0, 191)},         # เขียว
        2: {"name": "Exudates", "color": (255, 255, 0, 191)},     # เหลือง
        3: {"name": "Hemorrhages", "color": (255, 0, 0, 191)},    # แดง
        4: {"name": "Drusen", "color": (0, 255, 255, 191)},       # ฟ้า
    }

    # แปลงรูปต้นฉบับเป็น RGBA เพื่อให้รองรับแผ่นใส
    img_rgba = img.convert("RGBA")
    # สร้างแผ่นใสเปล่าๆ ขนาดเท่ารูปจริง ไว้รอรวมสีทุกคลาส
    overlay_layer = Image.new("RGBA", img_rgba.size, (0, 0, 0, 0))

    for class_idx, info in CLASS_INFO.items():
        sample_mask = mask[class_idx]
        
        if sample_mask.sum() == 0:
            print(f"✅ ไม่พบ {info['name']}")
        else:
            print(f"🚨 พบ {info['name']}! จำนวน {sample_mask.sum()} พิกเซล")
            
            # สร้างหน้ากาก (Mask) เฉพาะจุดที่ทายเจอ
            mask_img = Image.fromarray((sample_mask * 255).astype(np.uint8), mode='L')
            
            # สร้างแผ่นกระดาษสีตามคลาส ขนาดเท่ารูปภาพต้นฉบับ
            color_layer = Image.new("RGBA", img_rgba.size, info["color"])
            
            # ตัดแผ่นสีให้เหลือเฉพาะรูปทรงหน้ากาก
            disease_layer = Image.composite(color_layer, Image.new("RGBA", img_rgba.size, (0, 0, 0, 0)), mask_img)
            
            # เอาไปแปะทับรวมกับแผ่นใสหลัก
            overlay_layer = Image.alpha_composite(overlay_layer, disease_layer)

    # รวมรูปภาพต้นฉบับ เข้ากับ แผ่นใสที่ระบายสีแล้ว
    blended_image = Image.alpha_composite(img_rgba, overlay_layer).convert("RGB")
    
    # บันทึกรูปผสม
    blended_image.save("test_output_overlay.png")
    
    print(f"\n🖼️ เซฟรูปผสมเสร็จแล้ว! เปิดดูไฟล์ 'test_output_overlay.png' ได้เลยครับ")
