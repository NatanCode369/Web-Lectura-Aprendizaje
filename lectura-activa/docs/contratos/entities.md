# Contrato de entidades base

## `institutions`

```js
{
  _id: ObjectId,
  name: string,
  allowedEmailDomains: string[],
  settings: object,
  status: 'active' | 'inactive',
  createdAt: Date,
  updatedAt: Date,
}
```

## `users`

```js
{
  _id: ObjectId,
  authUserId: string,
  email: string,
  fullName: string,
  role: 'student' | 'teacher' | 'admin',
  institutionId: ObjectId,
  status: 'active' | 'suspended',
  profile: object,
  createdAt: Date,
  updatedAt: Date,
}
```

Los correos se almacenan normalizados en minúsculas. Las contraseñas y tokens pertenecen exclusivamente a Supabase Auth.