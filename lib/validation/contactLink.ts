import { z } from "zod";
import { Constants } from "@/types/database";
import { displayOrderSchema, optionalUrlSchema, publishedSchema, requiredTextSchema, textSchema } from "./shared";

export const contactTypeSchema = z.enum(Constants.public.Enums.contact_type);

export const contactLinkSchema = z
  .object({
    label: requiredTextSchema(100),
    type: contactTypeSchema,
    // Raw value: an email address, a handle, a phone number — shape depends
    // on `type`, so it can't be one blanket format check.
    value: requiredTextSchema(300),
    url: optionalUrlSchema,
    icon: textSchema(100).optional().nullable(),
    display_order: displayOrderSchema,
    published: publishedSchema,
  })
  .refine((data) => data.type !== "email" || z.email().safeParse(data.value).success, {
    message: "Must be a valid email address",
    path: ["value"],
  });

export type ContactLinkInput = z.infer<typeof contactLinkSchema>;
