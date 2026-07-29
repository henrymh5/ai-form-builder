import { z } from "zod";

/**
 * Theme tokens applied to the public form container at runtime — plan §4.1
 * / §10 Theme Editor / Style-Guide §23.22. Deliberately small and
 * enumerated: no free-form CSS, no arbitrary inline styles.
 */

const hexColorSchema = z
  .string()
  .regex(
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Muss ein gültiger Hex-Farbwert sein (z.B. #0D9488).",
  );

export const themeSchema = z.object({
  colorPrimary: hexColorSchema.default("#0D9488"),
  colorBackground: hexColorSchema.default("#F8FAFC"),
  colorText: hexColorSchema.default("#0F172A"),
  fontFamily: z.enum(["inter", "system"]).default("inter"),
  fontSizeBase: z.number().int().min(14).max(20).default(16),
  containerWidth: z.number().int().min(480).max(960).default(680),
  spacing: z.enum(["compact", "comfortable", "spacious"]).default("comfortable"),
  borderRadius: z.number().int().min(0).max(24).default(10),
  buttonStyle: z.enum(["solid", "outline"]).default("solid"),
  inputStyle: z.enum(["outline", "filled"]).default("outline"),
  logoAssetId: z.string().optional(),
  backgroundAssetId: z.string().optional(),
});
export type Theme = z.infer<typeof themeSchema>;
