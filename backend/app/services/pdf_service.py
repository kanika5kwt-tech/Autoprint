import fitz  # PyMuPDF
import os
import uuid
import base64

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_pdf(file_bytes: bytes, original_filename: str) -> dict:
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    return {"file_id": file_id, "file_path": file_path}

def analyze_pdf(file_path: str) -> dict:
    doc = fitz.open(file_path)
    total_pages = len(doc)
    
    colour_pages = []
    for i, page in enumerate(doc):
        # Page ka pixmap lo
        pix = page.get_pixmap()
        # Check karo colour hai ya nahi
        samples = pix.samples
        is_colour = False
        step = len(samples) // (pix.n * 100)  # 100 sample points
        step = max(step, pix.n)
        for j in range(0, min(len(samples) - pix.n, len(samples)), step):
            r = samples[j]
            g = samples[j+1] if pix.n > 1 else r
            b = samples[j+2] if pix.n > 2 else r
            if abs(int(r) - int(g)) > 10 or abs(int(g) - int(b)) > 10:
                is_colour = True
                break
        if is_colour:
            colour_pages.append(i + 1)
    
    # Pehle 3 pages ka preview banao
    previews = []
    for i in range(min(3, total_pages)):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode()
        previews.append(f"data:image/png;base64,{b64}")
    
    doc.close()
    
    return {
        "total_pages": total_pages,
        "has_colour_pages": len(colour_pages) > 0,
        "colour_page_numbers": colour_pages,
        "preview_images": previews
    }