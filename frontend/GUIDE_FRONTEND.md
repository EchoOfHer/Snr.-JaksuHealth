# 🔵 คู่มือสำหรับทีม Frontend (Jirawat)

ยินดีต้อนรับสู่ส่วน Frontend ของโปรเจกต์ JaksuHealth! ไฟล์นี้จะอธิบายโครงสร้างหน้าบ้านและการใช้ Git เพื่อให้ทำงานร่วมกับทีม Backend ได้อย่างลื่นไหล

## 📂 โครงสร้างโฟลเดอร์ (Frontend Structure - React/Vite)
```text
frontend/
├── public/               # ไฟล์ Assets ที่ไม่ถูก Compile เช่น โลโก้, รูปภาพไอคอน
├── src/
│   ├── components/       # UI Components แยกส่วน (เช่น UploadBox.jsx, ResultCard.jsx)
│   ├── pages/            # หน้าเว็บรวม (เช่น Home.jsx, Dashboard.jsx)
│   ├── services/         # ฟังก์ชันเรียก API (ยิง axios/fetch ไปหา Backend)
│   ├── styles/           # ไฟล์ CSS หรือตั้งค่า Tailwind
│   ├── App.jsx           # จุดรวม (Router) ของแอป
│   └── main.jsx          # จุด Render หลักของ React
├── package.json          # ไฟล์จัดการ Dependencies (รัน npm install)
└── vite.config.js        # ตั้งค่า Vite (สามารถตั้ง Proxy ยิงไปหา Backend ได้)
```

## 🌿 กฎการแตก Branch (Git Workflow)
กิ่งศูนย์กลางของโปรเจกต์นี้คือ `develop`
เมื่อคุณเริ่มทำงาน ให้สร้าง Branch ใหม่เสมอ โดยตั้งชื่อให้สื่อถึงงาน Frontend ดังนี้:
1. `git checkout develop` (กลับมากิ่งหลักก่อนเสมอ)
2. `git pull origin develop` (ดึงโค้ดล่าสุด)
3. แตกกิ่งใหม่:
   - `git checkout -b feature/frontend-ui` (สำหรับงานแก้ไข Layout/UI)
   - `git checkout -b feature/frontend-api-connect` (สำหรับเขียนโค้ดต่อ API กับ Backend)
4. เมื่อเสร็จงาน ให้ Push กิ่งของตัวเองขึ้นไป แล้วสร้าง Pull Request (PR) ไปที่ `develop`

## ⚠️ กฎเหล็กประจำ Frontend
*   โฟลเดอร์ `node_modules` จะไม่ถูกส่งขึ้น Git (ตั้งค่าใน .gitignore แล้ว) ดังนั้นเมื่อ Clone งานมาใหม่ หรือมีการเปลี่ยนกิ่ง ต้องรันคำสั่ง `npm install` เสมอก่อนเริ่มทำงาน
*   หากมีการติดตั้ง Library ใหม่ (เช่น npm install axios) อย่าลืม commit ไฟล์ `package.json` และ `package-lock.json` ขึ้นมาด้วย
