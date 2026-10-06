import { NextResponse } from "next/server";
export function GET() {
  return NextResponse.json({ ok: true, service: "eva-motion-lab", version: "0.2.0", credentials: "runtime-only" });
}
