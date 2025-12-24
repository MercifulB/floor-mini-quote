import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const payload = await req.json();
  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

  const res = await fetch(`${backendUrl}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
