# useCustomerTags.ts

- **Que hace**: CRUD for customer tags (fetch, create, delete). Silent on errors (tags are non-critical).
- **Datos**: GET/POST `/api/admin/tags`, DELETE `/api/admin/tags/:id`
- **Returns**: `{ tags, loading, fetchTags, createTag, deleteTag }`
- **Pitfalls**: Silently catches errors — if tags table doesn't exist, returns empty array