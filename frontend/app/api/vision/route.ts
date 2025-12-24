import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const scale = form.get("scale_ft_per_pixel")?.toString() ?? "0.02";
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
  const outForm = new FormData();
  outForm.append("file", file);

  const res = await fetch(`${backendUrl}/vision?scale_ft_per_pixel=${encodeURIComponent(scale)}`, {
    method: "POST",
    body: outForm
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
