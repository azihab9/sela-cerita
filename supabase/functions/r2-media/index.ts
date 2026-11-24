import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from "npm:@aws-sdk/client-s3";
import { getSignedUrl } from "npm:@aws-sdk/s3-request-presigner";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") || "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const env = (key: string) => {
  const value = Deno.env.get(key);
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};
const bucket = env("R2_BUCKET");
const publicClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"));
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") },
});
const capFor = (code: string | null) => ({ basic: 5, plus: 15, premium: 30 }[code || "basic"] || 5);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Authentication required" }, 401);
    const { data: authData, error: authError } = await publicClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Invalid session" }, 401);
    const user = authData.user;
    const body = await req.json();
    const action = body.action;
    const projectId = String(body.projectId || "");
    if (!/^[0-9a-f-]{36}$/i.test(projectId)) return json({ error: "Invalid project" }, 400);

    const { data: project, error: projectError } = await admin
      .from("projects")
      .select("id,owner_id,product_line,status,package_code")
      .eq("id", projectId).eq("owner_id", user.id).single();
    if (projectError || !project || project.product_line !== "mini_stories") {
      return json({ error: "Mini Stories project not found" }, 404);
    }
    if (!["draft", "pending_payment"].includes(project.status)) {
      return json({ error: "Project is not editable" }, 403);
    }

    if (action === "sign-upload") {
      const width = Number(body.width), height = Number(body.height);
      const filename = String(body.filename || "photo").slice(0, 120);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 6000 || height > 6000) {
        return json({ error: "Invalid image dimensions" }, 400);
      }
      const { count } = await admin.from("media_assets").select("id", { count: "exact", head: true }).eq("project_id", projectId);
      if ((count || 0) >= capFor(project.package_code)) return json({ error: "Photo limit reached for this package" }, 409);
      const objectKey = `${user.id}/${projectId}/${crypto.randomUUID()}.webp`;
      const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({
        Bucket: bucket, Key: objectKey, ContentType: "image/webp",
      }), { expiresIn: 300 });
      return json({ uploadUrl, objectKey, filename });
    }

    if (action === "confirm-upload") {
      const objectKey = String(body.objectKey || "");
      if (!objectKey.startsWith(`${user.id}/${projectId}/`) || !objectKey.endsWith(".webp")) {
        return json({ error: "Invalid object key" }, 400);
      }
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      const size = Number(head.ContentLength || 0);
      if (head.ContentType !== "image/webp" || size < 1 || size > 2 * 1024 * 1024) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
        return json({ error: "Optimized image must be WEBP and at most 2 MB" }, 400);
      }
      const { count } = await admin.from("media_assets").select("id", { count: "exact", head: true }).eq("project_id", projectId);
      if ((count || 0) >= capFor(project.package_code)) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
        return json({ error: "Photo limit reached for this package" }, 409);
      }
      const { data: asset, error } = await admin.from("media_assets").insert({
        project_id: projectId, owner_id: user.id, object_key: objectKey,
        original_filename: String(body.filename || "photo").slice(0, 120),
        mime_type: "image/webp", byte_size: size,
        width: Number(body.width), height: Number(body.height),
        position: count || 0,
      }).select("id,object_key,position,width,height,byte_size").single();
      if (error) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
        return json({ error: "Could not register uploaded image" }, 500);
      }
      const viewUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: objectKey }), { expiresIn: 900 });
      return json({ asset, viewUrl });
    }

    if (action === "view-url") {
      const assetId = String(body.assetId || "");
      const { data: asset, error } = await admin.from("media_assets")
        .select("id,object_key").eq("id", assetId).eq("project_id", projectId).eq("owner_id", user.id).single();
      if (error || !asset) return json({ error: "Image not found" }, 404);
      const viewUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: asset.object_key }), { expiresIn: 900 });
      return json({ viewUrl });
    }

    if (action === "delete") {
      const assetId = String(body.assetId || "");
      const { data: asset, error } = await admin.from("media_assets")
        .select("id,object_key").eq("id", assetId).eq("project_id", projectId).eq("owner_id", user.id).single();
      if (error || !asset) return json({ error: "Image not found" }, 404);
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: asset.object_key }));
      const { error: deleteError } = await admin.from("media_assets").delete().eq("id", asset.id);
      if (deleteError) return json({ error: "Image removed from storage but metadata cleanup failed" }, 500);
      return json({ ok: true });
    }

    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: "Storage operation failed" }, 500);
  }
});
