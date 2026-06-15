export interface ProductConfig {
  id: string;
  label: string;
  description: string;
  needsShade: boolean;
  needsTeethChart: boolean;
  category: "partial-denture" | "full-denture" | "veneer" | "retainer" | "guard";
}

export const PRODUCTS: ProductConfig[] = [
  {
    id: "flexible-partial",
    label: "Flexible Partial Denture",
    description:
      "Lightweight, metal-free replacement for 1-6 missing teeth. Made from flexible thermoplastic nylon for a natural look.",
    needsShade: true,
    needsTeethChart: true,
    category: "partial-denture",
  },
  {
    id: "acrylic-partial",
    label: "Acrylic Partial Flipper",
    description:
      "Affordable acrylic tooth replacement for 1-6 missing teeth. A popular choice for temporary or budget-friendly restoration.",
    needsShade: true,
    needsTeethChart: true,
    category: "partial-denture",
  },
  {
    id: "unilateral-partial",
    label: "Unilateral Partial Denture",
    description:
      "Compact single-side partial that clips onto existing teeth. Ideal for replacing 1-3 teeth on one side of your mouth.",
    needsShade: true,
    needsTeethChart: true,
    category: "partial-denture",
  },
  {
    id: "clear-partial",
    label: "Clear Partial Denture",
    description:
      "Nearly invisible flexible partial made from clear material. Replaces missing teeth with minimal visibility.",
    needsShade: false,
    needsTeethChart: true,
    category: "partial-denture",
  },
  {
    id: "full-denture",
    label: "Full Denture",
    description:
      "Complete upper or lower tooth replacement. Custom-crafted from your impressions for a natural, comfortable fit.",
    needsShade: true,
    needsTeethChart: false,
    category: "full-denture",
  },
  {
    id: "retainer",
    label: "Essix Retainer",
    description:
      "Crystal-clear custom retainer to maintain your smile after orthodontic treatment. BPA-free and virtually invisible.",
    needsShade: false,
    needsTeethChart: false,
    category: "retainer",
  },
  {
    id: "nightguard",
    label: "Nightguard",
    description:
      "Custom-fitted dental guard that protects teeth from grinding and clenching while you sleep.",
    needsShade: false,
    needsTeethChart: false,
    category: "guard",
  },
  {
    id: "sports-mouthguard",
    label: "Sports Mouthguard",
    description:
      "Durable custom-molded mouthguard for athletes. Provides superior protection and comfort during sports.",
    needsShade: false,
    needsTeethChart: false,
    category: "guard",
  },
  {
    id: "revived-veneers",
    label: "Revived Veneers",
    description:
      "Removable snap-on veneers that conceal chips, gaps, and discoloration. Full-coverage smile enhancement — no dental visits needed.",
    needsShade: true,
    needsTeethChart: false,
    category: "veneer",
  },
];

/** Given a product ID, return the route after the product selection screen (/step3). */
export function getNextAfterProduct(productId: string): string {
  const config = PRODUCTS.find((p) => p.id === productId);
  if (config?.needsShade) return "/step4";
  if (config?.needsTeethChart) return "/step5";
  return "/photo-intro";
}

/** Given a product ID, return the route after the shade selection screen (/step4). */
export function getNextAfterShade(productId: string): string {
  const config = PRODUCTS.find((p) => p.id === productId);
  if (config?.needsTeethChart) return "/step5";
  return "/photo-intro";
}

/** Given a product ID, return the back route for Step 5. */
export function getBackForTeethChart(productId: string): string {
  const config = PRODUCTS.find((p) => p.id === productId);
  if (config?.needsShade) return "/step4";
  return "/step3";
}

/**
 * Compute the total number of intake steps visible for this product.
 * Base steps: intake (1), state (2), product (3). Then optionally shade (4) and teeth chart (5).
 */
export function getTotalSteps(productId: string): number {
  const config = PRODUCTS.find((p) => p.id === productId);
  let total = 3; // intake, state, product are always shown
  if (config?.needsShade) total++;
  if (config?.needsTeethChart) total++;
  return total;
}

/**
 * Get the current step number for a given screen and product.
 * Intake=1, State=2, Product=3, Shade=4 (if shown), TeethChart=last.
 */
export function getStepNumber(
  screen: "intake" | "state" | "product" | "shade" | "teeth-chart",
  productId: string
): number {
  const config = PRODUCTS.find((p) => p.id === productId);
  switch (screen) {
    case "intake":
      return 1;
    case "state":
      return 2;
    case "product":
      return 3;
    case "shade":
      return 4;
    case "teeth-chart":
      // If shade is shown, teeth chart is step 5; otherwise step 4
      return config?.needsShade ? 5 : 4;
  }
}

/** Category display labels */
export const CATEGORY_LABELS: Record<ProductConfig["category"], string> = {
  "partial-denture": "Partial Denture",
  "full-denture": "Full Denture",
  veneer: "Veneers",
  retainer: "Retainer",
  guard: "Protective Guard",
};
