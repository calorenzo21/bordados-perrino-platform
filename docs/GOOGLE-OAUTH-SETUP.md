# Configuración de inicio de sesión con Google (Supabase)

Para que el botón "Google" en la pantalla de login funcione, debes configurar el proveedor Google en Supabase y crear credenciales OAuth en Google Cloud.

---

## 1. Google Cloud Console (crear credenciales OAuth)

1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto o selecciona uno existente.
3. Ve a **APIs y servicios** → **Pantalla de consentimiento de OAuth**:
   - Si no está configurada, elige tipo **Externo** y completa nombre de la app, correo de soporte y dominios (opcional).
   - Añade el **correo del desarrollador** en “Usuarios de prueba” si la app está en modo prueba.
4. Ve a **APIs y servicios** → **Credenciales** → **Crear credenciales** → **ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: por ejemplo `Bordados Perrino Web`.
   - **URIs de redirección autorizados** (crítico):  
     Google redirige a **Supabase**, no a tu app. Debes añadir **exactamente** la URL que muestra Supabase en la configuración de Google (campo "Callback URL (for OAuth)"):
     - `https://TU-PROYECTO.supabase.co/auth/v1/callback`  
     (reemplaza `TU-PROYECTO` por el subdominio de tu proyecto, ej. `tvzqoibzhrjiibgmaqqb.supabase.co` → la URL completa es `https://tvzqoibzhrjiibgmaqqb.supabase.co/auth/v1/callback`).  
     Puedes copiarla desde Supabase (Authentication → Providers → Google → "Copy" junto al Callback URL).
5. Crea y copia el **ID de cliente** y el **Secreto del cliente**. Los pegas en Supabase.

---

## 2. Supabase Dashboard (activar Google)

1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a **Authentication** → **Providers**.
3. Activa **Google**.
4. Pega el **Client ID** y **Client Secret** de Google.
5. Guarda los cambios.

En Google Cloud debes registrar la **Callback URL de Supabase** (la que ves en esta pantalla), no la URL de tu app.

---

## 3. Redirect URLs en Supabase (recomendado)

Para evitar errores en producción:

1. En Supabase: **Authentication** → **URL Configuration**.
2. En **Redirect URLs** añade:
   - `http://localhost:3000/auth/callback` (desarrollo)
   - `https://TU-DOMINIO.com/auth/callback` (producción)

Así solo las URLs que tú indicas podrán usarse tras el login con Google.

---

## 4. Resumen de URLs

| Dónde                | Qué configurar |
|----------------------|----------------|
| **Google Cloud**     | En "URIs de redirección autorizados" añade **solo** la Callback URL de Supabase (ej. `https://xxx.supabase.co/auth/v1/callback`). |
| **Supabase** → Redirect URLs | Aquí sí van las URLs de tu app: `http://localhost:3000/auth/callback` y `https://tu-dominio.com/auth/callback`. Son a donde Supabase envía al usuario después del login. |
| **Tu app**           | El login ya usa `window.location.origin + '/auth/callback'` como destino final. |

---

## 5. Comportamiento en la app

- **Login**: El usuario hace clic en “Google”, va a Google, autoriza y vuelve a `/auth/callback`.
- **Callback**: La app intercambia el código por sesión, crea o actualiza el perfil en `profiles` (rol `CLIENT` por defecto) y redirige a `/admin/dashboard` o `/client/panel` según el rol.
- **Nuevos usuarios**: Si es la primera vez que entran con Google, se crea automáticamente una fila en `profiles` con nombre y email de Google y rol `CLIENT`. Para darles rol admin hay que actualizarlos en la base de datos o desde tu flujo de administración.

Si tras configurar esto el botón Google falla, revisa la consola del navegador y los logs de Supabase (Authentication → Logs) para ver el mensaje de error exacto.
