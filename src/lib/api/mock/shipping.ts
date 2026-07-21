/**
 * The impression-kit return label.
 *
 * This is a layout artifact rather than backend logic, and `pdf-lib` runs
 * happily in the browser, so the label survives the backend being removed —
 * ported verbatim from the old `/api/shipping-label` route.
 *
 * The barcode is decorative and the reference is derived from the submission
 * id. A real implementation must replace both with a genuine carrier tracking
 * number and write it back to `submission.trackingNumber`.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { ShippingApi } from "../contract";
import { ApiError } from "../types";

const RETURN_ADDRESS = {
  name: "Revived Smiles",
  line1: "Returns Department",
  line2: "PO Box 1234",
  city: "Los Angeles, CA 90001",
};

const INSTRUCTIONS = [
  "1. Print this label and cut along the edges",
  "2. Attach securely to your impression kit box",
  "3. Drop off at your nearest USPS location",
  "4. Allow 5-7 business days for delivery",
];

/** Decorative only — not a scannable code. */
const BAR_WIDTHS = [
  2, 1, 3, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2, 1, 3, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 3, 1, 2,
];

export const mockShipping: ShippingApi = {
  async label(submissionId, patientName) {
    if (!submissionId) {
      throw new ApiError("validation", "A submission is needed to make a label.");
    }

    const doc = await PDFDocument.create();
    const page = doc.addPage([4 * 72, 6 * 72]); // 4×6 inch label
    const { width, height } = page.getSize();

    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

    const navy = rgb(14 / 255, 27 / 255, 77 / 255);
    const gray = rgb(0.4, 0.4, 0.4);
    const rule = rgb(0.85, 0.85, 0.85);

    const divider = (y: number) =>
      page.drawLine({
        start: { x: 24, y },
        end: { x: width - 24, y },
        thickness: 1,
        color: rule,
      });

    /* Header */
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
    divider(height - 64);

    /* From */
    let y = height - 88;
    page.drawText("FROM:", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    page.drawText(patientName || "Patient", { x: 24, y, size: 11, font: fontBold, color: navy });
    y -= 14;
    page.drawText(`Ref: ${submissionId.slice(0, 8).toUpperCase()}`, {
      x: 24,
      y,
      size: 9,
      font: fontRegular,
      color: gray,
    });

    /* To */
    y -= 24;
    page.drawText("TO:", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    page.drawText(RETURN_ADDRESS.name, { x: 24, y, size: 12, font: fontBold, color: navy });
    y -= 16;
    page.drawText(RETURN_ADDRESS.line1, { x: 24, y, size: 11, font: fontRegular, color: navy });
    y -= 14;
    page.drawText(RETURN_ADDRESS.line2, { x: 24, y, size: 11, font: fontRegular, color: navy });
    y -= 14;
    page.drawText(RETURN_ADDRESS.city, { x: 24, y, size: 11, font: fontRegular, color: navy });

    y -= 20;
    divider(y);

    /* Tracking reference */
    y -= 22;
    page.drawText("TRACKING REFERENCE", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 20;
    page.drawText(`RS-${submissionId.slice(0, 8).toUpperCase()}`, {
      x: 24,
      y,
      size: 18,
      font: fontBold,
      color: navy,
    });

    y -= 24;
    let barX = 24;
    BAR_WIDTHS.forEach((w) => {
      page.drawRectangle({ x: barX, y: y - 30, width: w, height: 30, color: navy });
      barX += w + 2;
    });

    /* Instructions */
    y -= 44;
    divider(y);
    y -= 18;
    page.drawText("INSTRUCTIONS", { x: 24, y, size: 8, font: fontBold, color: gray });
    y -= 16;
    INSTRUCTIONS.forEach((line) => {
      page.drawText(line, { x: 24, y, size: 9, font: fontRegular, color: navy });
      y -= 14;
    });

    const bytes = await doc.save();
    return new Blob([bytes as BlobPart], { type: "application/pdf" });
  },
};
