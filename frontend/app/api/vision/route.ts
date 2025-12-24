import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");
    const scale = formData.get("scale_ft_per_pixel");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (typeof scale !== "string") {
      return NextResponse.json({ error: "Missing scale_ft_per_pixel" }, { status: 400 });
    }

    const backendForm = new FormData();
    backendForm.append("file", file, file.name);
    backendForm.append("scale_ft_per_pixel", scale);

    // FastAPI backend
    const backendUrl = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

    const res = await fetch(`${backendUrl}/vision`, {
      method: "POST",
      body: backendForm
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json({ error: text }, { status: res.status });
    }

    // Return exact JSON you saw in curl
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
   catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

