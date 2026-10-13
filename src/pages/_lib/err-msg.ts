import { ConvexError } from "convex/values";

export function errMsg(e: unknown): string {
  return e instanceof ConvexError ? (e.data as { message: string }).message : "Something went wrong";
}
