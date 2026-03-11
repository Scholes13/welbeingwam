import { z } from 'zod'

const rewardTypeSchema = z.enum(['reveal', 'progress', 'mystery'])

const claimRewardSchema = z.object({
  rewardId: z.string().min(1),
})

const adminCreateRewardSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image_url: z.string().nullable().optional().default(''),
  required_points: z.coerce.number().int().nonnegative().optional().default(0),
  required_steps: z.coerce.number().int().nonnegative().optional().default(0),
  max_claims: z.coerce.number().int().nonnegative().optional().default(0),
  type: rewardTypeSchema.optional().default('reveal'),
  is_repeatable: z.coerce.boolean().optional().default(false),
})

const adminUpdateRewardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().nullable().optional(),
  required_points: z.coerce.number().int().nonnegative().optional(),
  required_steps: z.coerce.number().int().nonnegative().optional(),
  max_claims: z.coerce.number().int().nonnegative().optional(),
  type: rewardTypeSchema.optional(),
  is_repeatable: z.coerce.boolean().optional(),
})

export type ClaimRewardInput = z.infer<typeof claimRewardSchema>
export type AdminCreateRewardInput = z.infer<typeof adminCreateRewardSchema>
export type AdminUpdateRewardInput = z.infer<typeof adminUpdateRewardSchema>

export function parseClaimRewardInput(value: unknown) {
  return claimRewardSchema.safeParse(value)
}

export function parseAdminCreateRewardInput(value: unknown) {
  return adminCreateRewardSchema.safeParse(value)
}

export function parseAdminUpdateRewardInput(value: unknown) {
  return adminUpdateRewardSchema.safeParse(value)
}
