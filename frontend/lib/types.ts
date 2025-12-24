export type BBox = { x: number; y: number; w: number; h: number };

export type TakeoffItem = {
  id: string;
  width_ft: number;
  height_ft: number;
  confidence: number;
  bbox: BBox;
};

export type Takeoff = {
  project: { name: string; units: string; scale_ft_per_pixel: number };
  takeoff: { windows: TakeoffItem[]; doors: TakeoffItem[] };
  uncertainty: string[];
};

export type Quote = {
  counts: { windows: number; doors: number };
  material: string;
  include_installation: boolean;
  subtotal: number;
  quote_low: number;
  quote_high: number;
  assumptions: string[];
};
