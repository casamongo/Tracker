import { NextRequest, NextResponse } from "next/server";
import { parseOKRDoc, getTabTree } from "@/lib/google/docs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const quarter = searchParams.get("quarter");
  const team = searchParams.get("team");

  if (!quarter || !team) {
    return NextResponse.json({ error: "quarter and team are required" }, { status: 400 });
  }

  const rawDocId = process.env[`OKR_DOC_${quarter}`];
  if (!rawDocId) {
    return NextResponse.json({ error: `No OKR document configured for ${quarter}` }, { status: 404 });
  }

  // Accept either a bare doc ID or a full Google Docs URL
  const urlMatch = rawDocId.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const docId = urlMatch ? urlMatch[1] : rawDocId;

  const debug = searchParams.get("debug") === "true";

  try {
    if (debug) {
      const tree = await getTabTree(docId);
      return NextResponse.json({ tree });
    }
    const result = await parseOKRDoc(docId, team);
    return NextResponse.json({ quarter, team, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
