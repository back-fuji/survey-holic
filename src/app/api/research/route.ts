import { NextRequest, NextResponse } from "next/server";
import { researchMarket } from "@/lib/research";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const theme = typeof body.theme === "string" ? body.theme.trim() : "";
    if (!theme) {
      return NextResponse.json({ error: "theme is required" }, { status: 400 });
    }

    const result = await researchMarket(theme);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[research]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Research failed" },
      { status: 500 }
    );
  }
}
