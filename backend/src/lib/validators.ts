import { z } from "zod";

export const registerSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters").max(80),
    email: z.string().email("Enter a valid email address").toLowerCase(),
    phone: z
      .string()
      .min(10, "Enter a valid phone number")
      .max(15)
      .regex(/^\+?[\d\s-]+$/, "Enter a valid phone number"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72)
      .regex(/[A-Za-z]/, "Password must contain a letter")
      .regex(/\d/, "Password must contain a number"),
    confirmPassword: z.string(),
    username: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  email: z.string().min(1, "Enter a valid email and password").toLowerCase(),
  password: z.string().min(1, "Enter a valid email and password"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address").toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const fundWalletSchema = z.object({
  amount: z.number().min(100, "Minimum funding amount is ₦100").max(10000000, "Amount too large"),
  gateway: z.string().default("TEST"),
});

export const airtimeSchema = z.object({
  network: z.string().min(2),
  phone: z.string().min(10).max(15).regex(/^\+?[\d\s-]+$/, "Enter a valid phone number"),
  amount: z.number().min(50, "Minimum airtime amount is ₦50").max(100000, "Amount too large"),
});

export const dataSchema = z.object({
  network: z.string().min(2),
  phone: z.string().min(10).max(15).regex(/^\+?[\d\s-]+$/, "Enter a valid phone number"),
  planId: z.string().min(3),
});

export const electricitySchema = z.object({
  provider: z.string().min(2),
  meterNumber: z.string().min(6).max(30),
  meterType: z.enum(["prepaid", "postpaid"]),
  amount: z.number().min(500, "Minimum payment is ₦500").max(10000000),
});

export const electricityValidateSchema = z.object({
  provider: z.string().min(2),
  meterNumber: z.string().min(6).max(30),
  meterType: z.enum(["prepaid", "postpaid"]),
});

export const cableSchema = z.object({
  provider: z.string().min(2),
  smartCard: z.string().min(6).max(20),
  packageId: z.string().min(3),
  phone: z.string().max(20).optional(),
});

export const cableValidateSchema = z.object({
  provider: z.string().min(2),
  smartCard: z.string().min(6).max(20),
});

export const examPinSchema = z.object({
  productId: z.string().min(3),
  phone: z.string().min(10).max(15).regex(/^\+?[\d\s-]+$/, "Enter a valid phone number").optional(),
  quantity: z.number().int().min(1).max(5).default(1),
});

export const adminWalletSchema = z.object({
  amount: z.number(),
  type: z.enum(["CREDIT", "DEBIT"]),
  reason: z.string().min(3).max(200),
});

export const adminUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export const adminServiceSchema = z.object({
  category: z.string().min(2),
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  fee: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const adminDataPlanSchema = z.object({
  network: z.string().min(2),
  planName: z.string().min(2),
  size: z.string().min(1),
  validity: z.string().min(1),
  price: z.number().min(0),
  oldPrice: z.number().optional(),
  kind: z.string().default("DATA"),
  isActive: z.boolean().default(true),
});

export const adminExamPinSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  price: z.number().min(0),
  costPrice: z.number().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores");

export const kycSchema = z.object({
  idType: z.enum(["NIN", "BVN", "PASSPORT", "DRIVERS_LICENSE"]),
  idNumber: z.string().min(5).max(40),
  documentUrl: z.string().url("Enter a valid document URL").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AirtimeInput = z.infer<typeof airtimeSchema>;
export type DataInput = z.infer<typeof dataSchema>;
export type ElectricityInput = z.infer<typeof electricitySchema>;
export type CableInput = z.infer<typeof cableSchema>;
export type ExamPinInput = z.infer<typeof examPinSchema>;