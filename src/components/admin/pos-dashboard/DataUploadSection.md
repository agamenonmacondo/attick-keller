# DataUploadSection.tsx

- **Que hace**: Upload de archivo JSON con datos POS vía `POST /api/admin/pos-upload`
- **Datos**: POST a `/api/admin/pos-upload` con body JSON parsed del archivo
- **Dependencias**: `SectionHeading`, Phosphor icons
- **Pitfalls**: Solo acepta `.json`; error silencioso si JSON parse falla; llama `onUploadComplete` solo en success
