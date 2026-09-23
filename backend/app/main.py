from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.endpoints import router as predict_router

app = FastAPI(title="JaksuHealth AI API")

# ตั้งค่า CORS เพื่ออนุญาตให้ Frontend (React) จากทุกที่สามารถยิง API เข้ามาได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # ในอนาคตถ้าจะเอาขึ้น Server จริง ควรเปลี่ยนเป็น IP ของ Frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# นำ router มาเสียบเข้ากับตัวแอปหลัก โดยให้ขึ้นต้นด้วย /api
app.include_router(predict_router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to JaksuHealth AI API! 👁️"}