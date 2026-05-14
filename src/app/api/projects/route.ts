import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { projects } from "@/db/schema";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    
    const allProjects = await db.select().from(projects);
    return NextResponse.json({ success: true, data: allProjects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
