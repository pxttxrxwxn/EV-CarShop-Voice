import { NextResponse } from "next/server";
import products from "@/data/products.json";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { text } = await req.json();
    const transcript = (text || "").trim();

    if (!transcript) {
      return NextResponse.json({ error: "ไม่มีข้อความจากการพูด" }, { status: 400 });
    }

    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nUrl) {
      return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า N8N_WEBHOOK_URL" }, { status: 500 });
    }

    const resp = await fetch(n8nUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        products,
        lang: "th",
      }),
    });
    const data = await resp.json().catch(() => ({}));
    
    return NextResponse.json(data, { status: resp.ok ? 200 : resp.status });
  } catch (e: unknown) {
    let errorMessage = "Server error";

    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === "string") {
      errorMessage = e;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}