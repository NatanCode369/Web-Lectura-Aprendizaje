# API v1 — Readings

## GET /api/v1/readings

### Autenticación

Requiere `Authorization: Bearer <jwt>` emitido por Supabase Auth. Roles permitidos: `student`, `teacher`, `admin`. La institución se obtiene del usuario autenticado y nunca del query string.

### Query

| Campo | Tipo | Requerido | Default | Regla |
|---|---|---|---|---|
| `search` | string | No | — | Búsqueda case-insensitive en `title` y `summary` |
| `difficulty` | enum | No | — | `easy`, `medium`, `hard` |
| `maxMinutes` | integer | No | — | `estimatedMinutes <= maxMinutes` |
| `page` | integer | No | 1 | `>= 1` |
| `limit` | integer | No | 20 | `1..50` |

### Respuesta

```json
{
  "data": [
    {
      "id": "ObjectId-as-string",
      "title": "El principito",
      "summary": "...",
      "difficulty": "easy",
      "estimatedMinutes": 15,
      "authorName": "Ana López",
      "version": 1,
      "createdAt": "2026-09-15T10:30:00.000Z",
      "updatedAt": "2026-09-20T14:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

El endpoint solo devuelve `published` de la institución autenticada. No devuelve `content`, `activities`, `media`, `institutionId` ni `deletedAt`.
