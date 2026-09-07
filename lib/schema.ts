import { z } from "zod";

/**
 * Hero block schema:
 * - type: literal "hero"
 * - heading: required non-empty trimmed string
 * - subheading: optional/nullable; normalizes null, undefined, and empty strings to undefined
 */
export const HeroBlockSchema = z.object({
  type: z.literal("hero"),
  heading: z
    .string()
    .trim()
    .min(1, "Hero heading is required and cannot be empty"),
  subheading: z
    .union([z.string().trim(), z.null(), z.undefined()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === "") {
        return undefined;
      }
      return val;
    }),
});

/**
 * Single feature item schema:
 * - title: required non-empty string
 * - description: required non-empty string
 */
export const FeatureItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Feature title is required and cannot be empty"),
  description: z
    .string()
    .trim()
    .min(1, "Feature description is required and cannot be empty"),
});

/**
 * Features block schema:
 * - type: literal "features"
 * - items: array of 2 to 4 feature items
 */
export const FeaturesBlockSchema = z.object({
  type: z.literal("features"),
  items: z
    .array(FeatureItemSchema)
    .min(2, "Features block must have at least 2 items")
    .max(4, "Features block cannot have more than 4 items"),
});

/**
 * Footer block schema:
 * - type: literal "footer"
 * - text: required non-empty trimmed string
 */
export const FooterBlockSchema = z.object({
  type: z.literal("footer"),
  text: z
    .string()
    .trim()
    .min(1, "Footer text is required and cannot be empty"),
});

/**
 * PageSchema:
 * Structurally guarantees fixed 3-tuple block order:
 * [Hero, Features, Footer]
 */
export const PageSchema = z.object({
  blocks: z.tuple([
    HeroBlockSchema,
    FeaturesBlockSchema,
    FooterBlockSchema,
  ]),
});

export type HeroBlock = z.infer<typeof HeroBlockSchema>;
export type FeatureItem = z.infer<typeof FeatureItemSchema>;
export type FeaturesBlock = z.infer<typeof FeaturesBlockSchema>;
export type FooterBlock = z.infer<typeof FooterBlockSchema>;
export type Page = z.infer<typeof PageSchema>;
export type PageBlock = Page["blocks"][number];
