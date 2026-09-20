# 🟢 คู่มือสำหรับทีม Backend (Natthawut)

ยินดีต้อนรับสู่ส่วน Backend ของโปรเจกต์ JaksuHealth! ไฟล์นี้จะอธิบายโครงสร้างและการทำงานของคุณ เพื่อไม่ให้สับสนกับการทำงานของฝั่ง Frontend

## 📂 โครงสร้างโฟลเดอร์ (Backend Structure)
```text
backend/
├── app/
│   ├── main.py           # รันเซิร์ฟเวอร์ด้วย FastAPI (จุดเริ่มต้น)
│   ├── api/              # ไฟล์สร้าง Endpoint เช่น router สำหรับ /predict
│   ├── services/         # โค้ดหลักของ AI (inference.py โหลดโมเดล SegFormer)
│   ├── models/           # โฟลเดอร์เก็บไฟล์ .pth / .pt (ห้าม Push ขึ้น Git)
│   └── utils/            # ฟังก์ชันเสริม เช่น จัดการรูปภาพ, วาดขอบ Mask
├── requirements.txt      # ลิสต์ Library (pip install -r requirements.txt)
└── .env.example          # ตัวอย่างไฟล์ Environment (ซ่อน API Key ถ้ามี)
```

## 🌿 กฎการแตก Branch (Git Workflow)
กิ่งศูนย์กลางของโปรเจกต์นี้คือ `develop` 
เมื่อคุณเริ่มทำงาน ให้สร้าง Branch ใหม่เสมอ โดยตั้งชื่อให้สื่อถึงงาน Backend ดังนี้:
1. `git checkout develop` (กลับมากิ่งหลักก่อนเสมอ)
2. `git pull origin develop` (ดึงโค้ดล่าสุด)
3. แตกกิ่งใหม่:
   - `git checkout -b feature/backend-inference` (สำหรับงานเขียนโค้ด AI)
   - `git checkout -b feature/backend-api` (สำหรับทำ FastAPI)
4. เมื่อเสร็จงาน ให้ Push กิ่งของตัวเองขึ้นไป แล้วสร้าง Pull Request (PR) ไปที่ `develop`

## ⚠️ กฎเหล็กประจำ Backend
*   **ห้าม Push ไฟล์โมเดล `.pt` หรือ `.pth` ขึ้น Git เด็ดขาด** เพราะไฟล์มีขนาดใหญ่มาก Git จะค้าง ให้ส่งไฟล์โมเดลให้ทีมผ่าน Google Drive แล้วเอามาวางในเครื่องตัวเองแทน
*   รันโค้ดทั้งหมดผ่าน Virtual Environment (`env`) เสมอ เพื่อไม่ให้ Library ตีกัน
