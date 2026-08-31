import { NextResponse } from "next/server";
import { deleteDemoGlobalResource, isDemoMode } from "@/lib/auth/demo";
import { createServiceSupabase, createSessionSupabase, getAuthContext } from "@/lib/auth/server";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const { id } = await context.params;
  if (isDemoMode()) return deleteDemoGlobalResource(id, { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" })
    ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const supabase = await createSessionSupabase();
  const service = createServiceSupabase();
  if (!supabase || !service) return NextResponse.json({ error: "RESOURCE_DELETE_UNAVAILABLE" }, { status: 503 });
  const { data: resource } = await supabase.from("global_resources").select("id,storage_path").eq("id", id).maybeSingle();
  if (!resource) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const { error } = await supabase.from("global_resources").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "DELETE_FAILED" }, { status: 500 });
  await service.storage.from("teaching-materials").remove([resource.storage_path]);
  return NextResponse.json({ ok: true });
}
