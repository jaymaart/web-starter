import { NextResponse } from "next/server";

// Liveness probe for the platform's healthcheck (§11).
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
