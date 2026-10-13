# Nature Nest — admin studio

Standalone React admin application for pages, SEO slugs, stays, gallery images, blogs, banners, contact details and enquiries. MongoDB/authentication logic lives in [Resort-backend](https://github.com/prince62058/Resort-backend). The public website is [Resort-site](https://github.com/prince62058/Resort-site).

## Local

Node.js 22. Run `npm ci`, set `.env` from `.env.example`, then `npm run dev`. Use `BACKEND_URL=http://127.0.0.1:5174` and `SITE_URL=http://localhost:5173`. Admin opens at http://localhost:5175/ (the `/admin/` alias is also supported).

## Dokploy

- Repository: `prince62058/resort-admin`, branch `main`.
- Build path: `/` (repository root), never `.git`.
- Build type: Nixpacks; `nixpacks.toml` builds with `npm run build` and starts `npm start`.
- Domain container port: `3000`.
- Environment: `NODE_ENV=production`, `PORT=3000`, `BACKEND_URL=http://<backend-service-name>:5174`, `SITE_URL=https://<public-website-host>`.
- Dockerfile is included as an alternative build type with root context.

Use a reachable backend service name/URL, not `localhost` for another container. Use HTTPS on the public admin domain: production login uses Secure, HttpOnly, SameSite=Strict cookies. HTTP generated previews cannot use production admin sessions. The backend may use private HTTP behind the server-side gateway; browsers make same-origin API calls, so cross-site cookies/CORS are unnecessary.

`/healthz` checks the admin server; `/api/health` checks the connected backend. `SITE_URL` is read at runtime for every website/preview link. The UI opens at `/`; the entire admin app is excluded from indexing. Do not publish this as a static-only Vite app, because its Node gateway handles API requests and runtime configuration.

## Account and content

Use the existing owner credentials when reusing the same Atlas database. This deployment does not reset passwords. For a new database only, generate `ADMIN_SETUP_TOKEN` in the backend and create the owner in this admin UI. Password recovery is the backend's `admin:reset-password` command. Draft/publish/versioning, media validation and permissions are enforced by the backend.

After deployment, set Site settings → Live website URL to the public website URL and publish. Slugs remain editable; old published slugs redirect on the public website. `npm test` verifies the gateway. Full three-app tests and [deployment instructions](https://github.com/prince62058/Resort-site/blob/main/DEPLOYMENT.md) are maintained with the matching backend/site release.
