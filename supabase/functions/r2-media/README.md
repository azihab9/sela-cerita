# Mini Stories R2 media setup

This function keeps the R2 bucket private. The browser receives short-lived presigned URLs; it never receives R2 credentials or the Supabase service-role key.

## 1. Apply migrations in order

1. Apply the existing base schema: `supabase/schema.sql`.
2. Apply `supabase/migrations/20261123_multi_product_catalog.sql`.
3. Apply `supabase/migrations/20261124_mini_stories_editor_r2.sql`.

Do not apply the third migration before the catalog migration. It expects `templates.product_line`.

## 2. Create a private Cloudflare R2 bucket

Create a bucket (for example `sela-cerita-media`). Keep public access disabled. Do not expose the bucket endpoint or credentials in frontend files.

Configure the bucket CORS policy to allow browser PUT uploads from the deployed app origin. Example:

```json
[
  {
    "AllowedOrigins": [
      "https://azihab9.github.io",
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 3. Set Supabase Edge Function secrets

Set these secrets in the Supabase project:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `APP_ORIGIN` (for example `https://azihab9.github.io`)

Deploy `supabase/functions/r2-media` as the Edge Function named `r2-media`.

## 4. Upload contract

The function supports authenticated actions:

- `sign-upload`: validates project ownership, edit status, package photo limit, image dimensions and expected WEBP size; returns a 5-minute presigned PUT URL.
- `confirm-upload`: verifies object metadata in R2, then registers it in `media_assets`.
- `view-url`: returns a 15-minute signed read URL for an asset owned by the caller.
- `delete`: deletes the caller's object and metadata.

The launch Mini Stories package currently allows 5 photos per project. The editor converts selected images to WEBP, scales the longest side to at most 1600 px, and enforces a 2 MB output ceiling. R2 objects remain private; signed read URLs are temporary and must be refreshed when a preview is reopened.

## 5. Important deployment notes

- Never put the R2 secret key or Supabase service-role key in `app/*.js`.
- The current Mini Stories editor is a draft editor. Payment verification, final publishing, public rendering, annual expiry, and automated expiry notices are not implemented by this change.
- Before launch, add server-side rate limiting and a scheduled cleanup for abandoned upload objects that were signed but never confirmed.
- Package capacity is currently enforced by the Edge Function using `projects.package_code`; projects without a package code default to Basic (5 photos). Set the package only from trusted payment/order logic, not from the browser.
