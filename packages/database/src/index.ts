// Este módulo es SERVER-ONLY. No importar en Client Components.
import "server-only";

export { prisma } from "./client";
export type {
  User,
  ChildProfile,
  Subscription,
  Course,
  Lesson,
  Enrollment,
  PaymentCop,
  ChatMessage,
  Mentor,
  MentorSession,
  SessionFeedback,
} from "@prisma/client";
