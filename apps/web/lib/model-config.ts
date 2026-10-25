import { z } from "zod";

export const engravingRegionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/), label: z.string().min(1).max(100),
  materialIndex: z.number().int().min(0).max(100),
  // Top-left origin in texture pixel coordinates, normalized to [0,1].
  uv: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().positive().max(1), z.number().positive().max(1)]),
  widthMm: z.number().min(5).max(500), heightMm: z.number().min(5).max(500),
  finishes: z.array(z.enum(["ink", "gold", "recessed", "raised"])).min(1).max(4),
  cameraOrbit: z.string().regex(/^-?\d+(?:\.\d+)?deg \d+(?:\.\d+)?deg (?:\d+(?:\.\d+)?m|auto)$/).default("0deg 75deg auto"),
}).refine(r => r.uv[0] + r.uv[2] <= 1 && r.uv[1] + r.uv[3] <= 1, "UV region must fit the texture");

export const qrPlacementSchema = z.object({
  enabled: z.boolean().default(true),
  sizePercent: z.number().min(20).max(95).default(54),
  rotation: z.number().min(0).max(360).default(0),
  position: z.tuple([z.number(), z.number()]).default([0, 0]),
});
export type QrPlacement = z.infer<typeof qrPlacementSchema>;

export const modelConfigSchema = z.object({
  heightCm: z.number().positive().max(250).default(20),
  widthCm: z.number().positive().max(250).default(10),
  scale: z.number().positive().max(1000).default(1),
  orientation: z.tuple([z.number().min(-360).max(360), z.number().min(-360).max(360), z.number().min(-360).max(360)]).default([0, 0, 0]),
  cameraOrbit: z.string().regex(/^-?\d+(?:\.\d+)?deg \d+(?:\.\d+)?deg (?:\d+(?:\.\d+)?m|auto)$/).default("0deg 75deg auto"),
  arEnabled: z.boolean().default(false),
  regions: z.array(engravingRegionSchema).max(20).default([]),
  qrPlacement: qrPlacementSchema.optional(),
});
export type ModelConfig = z.infer<typeof modelConfigSchema>;
export type EngravingRegion = z.infer<typeof engravingRegionSchema>;
export const personalizationSchema = z.object({
  schemaVersion: z.literal(1), modelAssetId: z.string().uuid(), regionId: z.string().min(1).max(40),
  text: z.string().trim().min(1).max(400), font: z.enum(["sans", "serif"]),
  fontSizeMm: z.number().min(2).max(30), align: z.enum(["left", "center", "right"]),
  finish: z.enum(["ink", "gold", "recessed", "raised"]), depth: z.number().min(.1).max(2),
  rotation: z.number().min(-30).max(30),
  previewDataUrl: z.string().max(500000).regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/),
});
export type Personalization = z.infer<typeof personalizationSchema>;
