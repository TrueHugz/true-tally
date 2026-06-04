import type { Institution, Branch, Product } from "./types";

const NUH = "NUH Health & U";

const institutions: Institution[] = [{ institution: NUH, remarks: "" }];

const branches: Branch[] = [
  { institution: NUH, branch: "NUH Medical Centre (Zone B)", remarks: "#03-01 (within the Medical Centre Pharmacy)" },
  { institution: NUH, branch: "Main Building (Zone F)", remarks: "#01-01 (beside the Main Building Pharmacy)" },
  { institution: NUH, branch: "Main Building (Zone G)", remarks: "#01-11 (opposite the Kopitiam food court)" },
];

const products: Product[] = [
  { description: "CoolDiscreet (M)", sku: "CD-M-20", type: "Bag" },
  { description: "CoolDiscreet (M) (Free)", sku: "CD-M-20 (Free)", type: "Bag" },
  { description: "CoolDiscreet (L)", sku: "CD-L-20", type: "Bag" },
  { description: "CoolDiscreet (L) (Free)", sku: "CD-L-20 (Free)", type: "Bag" },
  { description: "CoolDiscreet+ (M)", sku: "CDP-M-15", type: "Bag" },
  { description: "CoolDiscreet+ (M) (Free)", sku: "CDP-M-15 (Free)", type: "Bag" },
  { description: "CoolDiscreet+ (L)", sku: "CDP-L-15", type: "Bag" },
  { description: "CoolDiscreet+ (L) (Free)", sku: "CDP-L-15 (Free)", type: "Bag" },
  { description: "CoolComfort (M)", sku: "CC-M-15", type: "Bag" },
  { description: "CoolComfort (M) (Free)", sku: "CC-M-15 (Free)", type: "Bag" },
  { description: "CoolComfort (L)", sku: "CC-L-15", type: "Bag" },
  { description: "CoolComfort (L) (Free)", sku: "CC-L-15 (Free)", type: "Bag" },
  { description: "CoolGuard (M)", sku: "CG-M-15", type: "Bag" },
  { description: "CoolGuard (M) (Free)", sku: "CG-M-15 (Free)", type: "Bag" },
  { description: "CoolGuard (L)", sku: "CG-L-15", type: "Bag" },
  { description: "CoolGuard (L) (Free)", sku: "CG-L-15 (Free)", type: "Bag" },
];

export const SEED = { institutions, branches, products };
