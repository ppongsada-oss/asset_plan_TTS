import { getRequestContext } from "@cloudflare/next-on-pages";
import { getDb } from "@/db";
import { categories, sub_categories } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    const cats = await db.select().from(categories);
    const subCats = await db.select().from(sub_categories);

    return Response.json({ success: true, categories: cats, sub_categories: subCats });
  } catch (error: any) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as any;

    if (body.type === "category") {
      await db.insert(categories).values({ code: body.code, name: body.name }).onConflictDoNothing();
      return Response.json({ success: true, message: "Category saved" });
    } else if (body.type === "sub_category") {
      await db.insert(sub_categories).values({
        code: body.code,
        category_code: body.category_code,
        name: body.name
      }).onConflictDoNothing();
      return Response.json({ success: true, message: "Sub-Category saved" });
    }

    return Response.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as any;

    if (body.type === "category") {
      await db.update(categories).set({ name: body.name }).where(eq(categories.code, body.code));
      return Response.json({ success: true, message: "Category updated" });
    } else if (body.type === "sub_category") {
      await db.update(sub_categories).set({ name: body.name }).where(eq(sub_categories.code, body.code));
      return Response.json({ success: true, message: "Sub-Category updated" });
    }

    return Response.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as any;

    if (body.type === "category") {
      await db.delete(categories).where(eq(categories.code, body.code));
      return Response.json({ success: true, message: "Category deleted" });
    } else if (body.type === "sub_category") {
      await db.delete(sub_categories).where(eq(sub_categories.code, body.code));
      return Response.json({ success: true, message: "Sub-Category deleted" });
    }

    return Response.json({ success: false, message: "Invalid type" }, { status: 400 });
  } catch (error: any) {
    if (error.message?.includes("FOREIGN KEY constraint failed")) {
      return Response.json({ success: false, message: "Cannot delete because it is being used by existing equipment." }, { status: 400 });
    }
    return Response.json({ success: false, message: error.message }, { status: 500 });
  }
}
