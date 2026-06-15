import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const RETURN_ADDRESS = {
  name: "Revived Smiles",
  line1: "Returns Department",
  line2: "PO Box 1234",
  city: "Los Angeles, CA 90001",
};

export async function POST(req: NextRequest) {
  try {
    const { submissionId, patientName } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    const page = doc.addPage([4 * 72, 6 * 72]); // 4×6 inch label
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const navy = rgb(14 / 255, 27 / 255, 77 / 255);
    const gray = rgb(0.4, 0.4, 0.4);

    // ── Header ──
    page.drawText("REVIVED SMILES", {
      x: 24,
      y: height - 36,
      size: 16,
      font: fontBold,
      color: navy,
    });
    page.drawText("Impression Kit Return Label", {
      x: 24,
      y: height - 52,
      size: 9,
      font: fontRegular,
      color: gray,
    });

    // ── Divider ──
    page.drawLine({
      start: { x: 24, y: height - 64 },
      end: { x: width - 24, y: height - 64 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // ── FROM section ──
    let y = height - 88;
    page.drawText("FROM:", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    const fromName = patientName || "Patient";
    page.drawText(fromName, { x: 24, y, size: 11, font: fontBold, color: navy });
    y -= 14;
    page.drawText(`Ref: ${submissionId.slice(0, 8).toUpperCase()}`, {
      x: 24, y, size: 9, font: fontRegular, color: gray,
    });

    // ── TO section ──
    y -= 32;
    page.drawText("TO:", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    page.drawText(RETURN_ADDRESS.name, { x: 24, y, size: 12, font: fontBold, color: navy });
    y -= 16;
    page.drawText(RETURN_ADDRESS.line1, { x: 24, y, size: 11, font: fontRegular, color: navy });
    y -= 14;
    page.drawText(RETURN_ADDRESS.line2, { x: 24, y, size: 11, font: fontRegular, color: navy });
    y -= 14;
    page.drawText(RETURN_ADDRESS.city, { x: 24, y, size: 11, font: fontRegular, color: navy });

    // ── Divider ──
    y -= 20;
    page.drawLine({
      start: { x: 24, y },
      end: { x: width - 24, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // ── Tracking reference barcode-style block ──
    y -= 28;
    page.drawText("TRACKING REFERENCE", {
      x: 24, y, size: 8, font: fontBold, color: gray,
    });
    y -= 20;
    const trackingRef = `RS-${submissionId.slice(0, 8).toUpperCase()}`;
    page.drawText(trackingRef, {
      x: 24, y, size: 18, font: fontBold, color: navy,
    });

    // ── Barcode bars (decorative) ──
    y -= 24;
    const barWidths = [2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2];
    let barX = 24;
    for (const w of barWidths) {
      page.drawRectangle({
        x: barX,
        y: y - 30,
        width: w,
        height: 30,
        color: navy,
      });
      barX += w + 2;
    }

    // ── Instructions ──
    y -= 72;
    page.drawLine({
      start: { x: 24, y },
      end: { x: width - 24, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 18;
    page.drawText("INSTRUCTIONS", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    const instructions = [
      "1. Print this label and cut along the edges",
      "2. Attach securely to your impression kit box",
      "3. Drop off at your nearest USPS location",
      "4. Allow 5-7 business days for delivery",
    ];
    for (const line of instructions) {
      page.drawText(line, { x: 24, y, size: 9, font: fontRegular, color: navy });
      y -= 14;
    }

    const pdfBytes = await doc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="shipping-label-${submissionId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Shipping label generation error:", err);
    return NextResponse.json({ error: "Failed to generate shipping label" }, { status: 500 });
  }
}
