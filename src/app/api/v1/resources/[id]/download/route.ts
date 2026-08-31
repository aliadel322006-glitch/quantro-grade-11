import { NextResponse } from "next/server";
import { isDemoMode, readDemoGlobalResource } from "@/lib/auth/demo";
import { createServiceSupabase, createSessionSupabase, getAuthContext } from "@/lib/auth/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role === "student" && !session.curriculumAccess)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) {
    const resource = readDemoGlobalResource(id);
    if (!resource) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const safeName = resource.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_");
    return new Response(resource.bytes.buffer as ArrayBuffer, { headers: { "Content-Type": resource.mimeType, "Content-Disposition": `attachment; filename="${safeName}"`, "Cache-Control": "no-store" } });
  }
  const supabase = await createSessionSupabase();
  const service = createServiceSupabase();
  if (!supabase || !service) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 503 });
  const { data: resource } = await supabase.from("global_resources").select("storage_path").eq("id", id).maybeSingle();
  if (!resource) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { data, error } = await service.storage.from("teaching-materials").createSignedUrl(resource.storage_path, 60);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
