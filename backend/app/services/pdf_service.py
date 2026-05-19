import fitz  # PyMuPDF
import os
import uuid
import base64
from pathlib import Path

# Create uploads directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


def save_pdf(file_bytes: bytes, original_filename: str) -> dict:
    """Save uploaded PDF file"""
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    return {
        "file_id": file_id,
        "file_path": file_path,
        "original_filename": original_filename,
        "file_size": len(file_bytes),
        "converted_from": None
    }


def analyze_pdf(file_path: str) -> dict:
    """Analyze PDF for total pages, color pages, and generate previews"""
    doc = fitz.open(file_path)
    total_pages = len(doc)
    
    colour_pages = []
    
    for i, page in enumerate(doc):
        # Try to detect color more accurately
        pix = page.get_pixmap(alpha=False)  # RGB mode
        
        is_colour = False
        
        # Method 1: Check colorspace
        if pix.colorspace is not None and pix.colorspace.name != "DeviceGray":
            is_colour = True
        else:
            # Method 2: Manual sampling (more reliable fallback)
            samples = pix.samples
            n = pix.n  # bytes per pixel
            width, height = pix.width, pix.height
            
            # Sample a 20x20 grid
            step_x = max(1, width // 20)
            step_y = max(1, height // 20)
            
            for y in range(0, height, step_y):
                for x in range(0, width, step_x):
                    idx = (y * width + x) * n
                    if idx + 2 >= len(samples):
                        continue
                    r, g, b = samples[idx:idx+3]
                    if abs(int(r) - int(g)) > 12 or abs(int(g) - int(b)) > 12 or abs(int(r) - int(b)) > 12:
                        is_colour = True
                        break
                if is_colour:
                    break
                    
        if is_colour:
            colour_pages.append(i + 1)
    
    # Generate preview images (first 3 pages)
    previews = []
    for i in range(min(3, total_pages)):
        page = doc[i]
        # Scale down for preview
        pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5), alpha=False)
        img_bytes = pix.tobytes("png")
        b64 = base64.b64encode(img_bytes).decode('utf-8')
        previews.append(f"data:image/png;base64,{b64}")
    
    doc.close()
    
    return {
        "total_pages": total_pages,
        "has_colour_pages": len(colour_pages) > 0,
        "colour_page_numbers": colour_pages,
        "preview_images": previews
    }


def convert_image_to_pdf(image_bytes: bytes, original_filename: str) -> dict:
    """Convert image (jpg, png, webp, etc.) to PDF"""
    try:
        from PIL import Image
        import io

        img = Image.open(io.BytesIO(image_bytes))

        # Convert to RGB (PDF doesn't support RGBA, P mode well)
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

        # Save as PDF
        img.save(file_path, "PDF", resolution=200)

        return {
            "file_id": file_id,
            "file_path": file_path,
            "original_filename": original_filename,
            "file_size": os.path.getsize(file_path),
            "converted_from": "image"
        }

    except ImportError:
        raise Exception("Pillow is not installed. Run: pip install Pillow")
    except Exception as e:
        raise Exception(f"Image to PDF conversion failed: {str(e)}")


def convert_docx_to_pdf(docx_bytes: bytes, original_filename: str) -> dict:
    """Convert DOCX to PDF (basic text support)"""
    try:
        from docx import Document
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        import io

        doc = Document(io.BytesIO(docx_bytes))
        
        file_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")

        pdf_doc = SimpleDocTemplate(
            file_path,
            pagesize=A4,
            rightMargin=inch,
            leftMargin=inch,
            topMargin=inch,
            bottomMargin=inch
        )

        styles = getSampleStyleSheet()
        story = []

        for para in doc.paragraphs:
            if para.text.strip():
                try:
                    style_name = para.style.name if para.style else 'Normal'
                    if 'Heading' in style_name or 'Title' in style_name:
                        style = styles['Heading1']
                    elif 'List' in style_name:
                        style = styles['Normal']
                    else:
                        style = styles['Normal']
                except:
                    style = styles['Normal']

                story.append(Paragraph(para.text, style))
                story.append(Spacer(1, 8))

        # Handle empty document
        if not story:
            story.append(Paragraph("(This document appears to be empty)", styles['Normal']))

        pdf_doc.build(story)

        return {
            "file_id": file_id,
            "file_path": file_path,
            "original_filename": original_filename,
            "file_size": os.path.getsize(file_path),
            "converted_from": "docx"
        }

    except ImportError as e:
        raise Exception(f"Missing dependency: {str(e)}. Install with: pip install python-docx reportlab")
    except Exception as e:
        raise Exception(f"DOCX to PDF conversion failed: {str(e)}")