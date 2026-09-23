FROM python:3.10-slim

WORKDIR /app

# ติดตั้ง System dependencies ที่จำเป็นสำหรับ OpenCV และอื่นๆ
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# คัดลอกไฟล์ requirements ก่อนเพื่อใช้ Cache layer ของ Docker
COPY requirements.txt .

# ติดตั้ง PyTorch (CPU Version) แยกต่างหากเพื่อลดขนาด Image และป้องกันการดึง GPU Version
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# ติดตั้ง Dependencies อื่นๆ ที่เหลือ
RUN pip install --no-cache-dir -r requirements.txt

# คัดลอกโค้ดทั้งหมดในโฟลเดอร์ backend เข้าไปใน Image
COPY . .

# Hugging Face Spaces บังคับใช้ Port 7860
EXPOSE 7860

# สั่งรัน Backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
