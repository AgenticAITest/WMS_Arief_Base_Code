import { z } from 'zod';

export const profileFormSchema = z.object({
  fullname: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email address"),
  avatar: z.string().url("Please enter a valid URL").optional().or(z.literal(""))
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;