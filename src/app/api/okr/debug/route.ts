import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import fs from "fs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const docId = searchParams.get("docId") ?? "1F7fwzWxTYBSAGUc2U3_kG4x75oC8Ua4Yx0o9omw1i30";

  const info: Record<string, unknown> = {};

  // Check env vars
  info.hasServiceAccountFile = !!process.env.GOOGLE_SERVICE_ACCOUNT_FILE;
  info.serviceAccountFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE ?? null;
  info.hasServiceAccountJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  info.currentQuarter = process.env.OKR_CURRENT_QUARTER ?? null;
  const rawDocId = process.env[`OKR_DOC_${process.env.OKR_CURRENT_QUARTER}`] ?? null;
  info.docIdFromEnv = rawDocId;
  const urlMatch = rawDocId?.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const resolvedDocId = urlMatch ? urlMatch[1] : (rawDocId ?? docId);
  info.docIdUsed = resolvedDocId;

  // Check if file exists
  if (process.env.GOOGLE_SERVICE_ACCOUNT_FILE) {
    info.fileExists = fs.existsSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE);
    if (info.fileExists) {
      try {
        const raw = fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_FILE, "utf8");
        const parsed = JSON.parse(raw);
        info.clientEmail = parsed.client_email;
        info.projectId = parsed.project_id;
        info.keyType = parsed.type;
      } catch (e) {
        info.fileParseError = (e as Error).message;
      }
    }
  }

  // Try auth + API call
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_FILE,
      scopes: ["https://www.googleapis.com/auth/documents.readonly"],
    });
    info.authCreated = true;

    const docs = google.docs({ version: "v1", auth });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (docs.documents.get as unknown as (p: Record<string, unknown>) => Promise<{ data: Record<string, unknown> }>)({
      documentId: resolvedDocId,
      includeTabsContent: true,
    });

    type TabNode = { tabProperties?: { title?: string; tabId?: string }; childTabs?: TabNode[] };
    function flattenTabs(tabs: TabNode[], depth = 0): { title: string; depth: number }[] {
      const result: { title: string; depth: number }[] = [];
      for (const tab of tabs) {
        result.push({ title: tab.tabProperties?.title ?? "(untitled)", depth });
        if (tab.childTabs?.length) result.push(...flattenTabs(tab.childTabs, depth + 1));
      }
      return result;
    }

    const tabs = response.data.tabs as TabNode[] | undefined;
    info.success = true;
    info.docTitle = response.data.title;
    info.tabCount = tabs?.length ?? 0;
    info.allTabs = flattenTabs(tabs ?? []);
  } catch (e) {
    info.apiError = (e as Error).message;
  }

  return NextResponse.json(info, { status: 200 });
}
