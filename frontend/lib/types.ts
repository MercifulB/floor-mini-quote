export type Detection = {
  label: string;
  bbox: [number, number, number, number];
  score: number;
};

export type TakeoffMeta = {
  scale_ft_per_pixel: number;
  resize_scale?: number;
  template_counts?: Record<string, number>;
};

export type Takeoff = {
  takeoff: {
    windows: number;
    doors: number;
  };
  detections: Detection[];
  uncertainty: string[];
  meta?: TakeoffMeta;
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
