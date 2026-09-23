import gradio as gr
from app.main import app as custom_app

# สร้างหน้า UI ปลอมๆ หลอก Hugging Face ว่านี่คือแอป Gradio
demo = gr.Blocks()
with demo:
    gr.Markdown("# 🟢 JaksuHealth Backend API is Running!")
    gr.Markdown("API Endpoint is active at `/api/predict`")

# ยัด FastAPI ของเราเข้าไปซ่อนใต้ Gradio
app = gr.mount_gradio_app(custom_app, demo, path="/")
