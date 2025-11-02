from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from pypdf import PdfReader, PdfWriter
import io

# === Your Company Details ===
company_name = "TibaCare Telemedicine"
company_address = "Nairobi, Kenya"
company_email = "humphreykiboi1@gmail.com"
company_phone = "+2547XXXXXXXX"
admin_name = "Humphrey Chemos Kiboi"
admin_id = "12345678"
admin_email = "humphreykiboi1@gmail.com"
admin_phone = "+2547XXXXXXXX"
reason_for_mpesa = "Enable patients to pay securely for telemedicine consultations and medical services via M-PESA."

# === Helper function to overlay text ===
def fill_pdf(input_pdf, output_pdf, fields):
    packet = io.BytesIO()
    can = canvas.Canvas(packet, pagesize=A4)

    # Example positions (x, y in points) → adjust based on your forms
    for text, pos in fields.items():
        can.drawString(pos[0], pos[1], text)

    can.save()
    packet.seek(0)

    # Read overlay + original
    overlay = PdfReader(packet)
    original = PdfReader(open(input_pdf, "rb"))
    writer = PdfWriter()

    page = original.pages[0]
    page.merge_page(overlay.pages[0])
    writer.add_page(page)

    with open(output_pdf, "wb") as f:
        writer.write(f)

# === Example for Application Form ===
application_fields = {
    company_name: (120, 730),
    company_address: (120, 710),
    company_email: (120, 690),
    company_phone: (120, 670),
    reason_for_mpesa: (120, 630),
    admin_name: (120, 580),
    admin_id: (120, 560),
    admin_email: (120, 540),
    admin_phone: (120, 520),
}

fill_pdf(
    "M-PESA_C2B_Service_Application_Form_2025.pdf",
    "filled_forms/mpesa_c2b_service_application_filled.pdf",
    application_fields,
)

print("Application form filled successfully!")
