import { NextRequest, NextResponse } from "next/server";
import { getUserPayload } from "@/lib/auth-check";


export async function GET(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    
    if (!payload) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: payload });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
