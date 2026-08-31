import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createDemoGlobalResource, isDemoMode, listDemoGlobalResources } from "@/lib/auth/demo";
import { createServiceSupabase, createSessionSupabase, getAuthContext } from "@/lib/auth/server";
import { MAX_TEACHING_MATERIAL_BYTES, hasExpectedMaterialSignature, materialMimeType, materialTypeFromName } from "@/lib/global-content";
import { localizedTextSchema, mapResource, type DbResource } from "@/lib/global-content-server";

export const runtime = "nodejs";

const resourceFieldsSchema = z.object({ title: localizedTextSchema, description: localizedTextSchema.optional() });

function readLocalized(formData: FormData, field: "title" | "description") {
  const en = formData.get(`${field}En`);
  const ar = formData.get(`${field}Ar`);
  if (typeof en !== "string" && typeof ar !== "string") return undefined;
  return { en: typeof en === "string" ? en : "", ar: typeof ar === "string" ? ar : "" };
}

function resourceSelect() {
  return "id,title,description,original_file_name,file_type,byte_size,uploaded_by_teacher_id,uploaded_by_name,created_at";
}

export async function GET() {
  const session = await getAuthContext();
  if (!session || (session.role === "student" && !session.curriculumAccess)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (isDemoMode()) return NextResponse.json({ resources: listDemoGlobalResources({ id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" }) });
  const supabase = await createSessionSupabase();
  if (!supabase) return NextResponse.json({ error: "AUTH_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.from("global_resources").select(resourceSelect()).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "RESOURCES_UNAVAILABLE" }, { status: 500 });
  return NextResponse.json({ resources: (data ?? []).map((row) => mapResource(row as unknown as DbResource, session.userId, session.role === "admin")) });
}

export async function POST(request: Request) {
  const session = await getAuthContext();
  if (!session || (session.role !== "teacher" && session.role !== "admin")) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const file = formData.get("file");
  const parsed = resourceFieldsSchema.safeParse({ title: readLocalized(formData, "title"), description: readLocalized(formData, "description") });
  if (!parsed.success || !(file instanceof File)) return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  const type = materialTypeFromName(file.name);
  if (!type || file.size < 1 || file.size > MAX_TEACHING_MATERIAL_BYTES) return NextResponse.json({ error: "UNSUPPORTED_FILE" }, { status: 400 });
  const expectedMime = materialMimeType(type);
  if (file.type && file.type !== expectedMime) return NextResponse.json({ error: "UNSUPPORTED_FILE" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasExpectedMaterialSignature(type, bytes)) return NextResponse.json({ error: "UNSUPPORTED_FILE" }, { status: 400 });

  if (isDemoMode()) {
    const resource = createDemoGlobalResource({ title: parsed.data.title, ...(parsed.data.description ? { description: parsed.data.description } : {}), fileName: file.name, fileType: type, fileSize: file.size, bytes, mimeType: expectedMime, uploader: { id: session.userId, role: session.role, displayName: session.displayName, email: session.email, curriculumAccess: session.curriculumAccess, createdAt: "" } });
    return NextResponse.json({ resource }, { status: 201 });
  }

  const supabase = await createSessionSupabase();
  const service = createServiceSupabase();
  if (!supabase || !service) return NextResponse.json({ error: "UPLOAD_UNAVAILABLE" }, { status: 503 });
  const resourceId = randomUUID();
  const storagePath = `${session.userId}/${resourceId}.${type}`;
  const { error: uploadError } = await service.storage.from("teaching-materials").upload(storagePath, file, { contentType: expectedMime, upsert: false });
  if (uploadError) return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  const { data, error } = await supabase.from("global_resources").insert({
    id: resourceId, title: parsed.data.title, description: parsed.data.description ?? null, storage_path: storagePath,
    original_file_name: file.name, file_type: type, byte_size: file.size, uploaded_by_teacher_id: session.userId,
  }).select(resourceSelect()).single();
  if (error || !data) {
    await service.storage.from("teaching-materials").remove([storagePath]);
    return NextResponse.json({ error: "RESOURCE_CREATE_FAILED" }, { status: 500 });
  }
  return NextResponse.json({ resource: mapResource(data as unknown as DbResource, session.userId, session.role === "admin") }, { status: 201 });
}
