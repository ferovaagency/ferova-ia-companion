# Lee con Koa en Play Store y App Store

La app de tienda es un contenedor nativo (Capacitor 8) que carga
`https://librero-ia.ferova.com.co`. Lo que se publica en Lovable llega a la app sin
pasar otra vez por revisión. Solo hay que volver a subir a las tiendas cuando cambie
algo nativo: permisos, icono, plugins o versión.

- Identificador: `co.com.ferova.leeconkoa` (Android `applicationId` e iOS Bundle ID).
- Proyectos nativos: `android/` (Android Studio) e `ios/` (Xcode, solo en Mac).
- Sin conexión se muestra `mobile/www/offline.html`.

## Ya resuelto en el código

| Requisito | Dónde |
|---|---|
| Sin compras externas dentro de la app (Apple 3.1.1, pagos de Google Play) | `src/lib/platform.ts`: en la app nativa se ocultan los banners Pro, el botón «Pasar a Pro», los precios, la página `/pro` y el enlace a Whop. Quien pagó en la web conserva Pro. |
| Eliminar la cuenta desde la app (Apple 5.1.1(v), Google Play) | Ajustes → «Eliminar mi cuenta». Usa `src/lib/account.functions.ts` y la migración `0019_delete_reader_account.sql`. |
| Inicio con Google bloqueado en vistas web | En la app nativa solo aparece correo y contraseña. Por eso tampoco se exige «Iniciar sesión con Apple» (Apple 4.8). |
| Cámara para el escáner de ISBN | `NSCameraUsageDescription` en `ios/App/App/Info.plist`; permiso `CAMERA` en `AndroidManifest.xml`. |
| Compartir nativo | `@capacitor/share`; `src/lib/share.ts` lo usa cuando existe. |

## Pendiente antes de enviar

1. **Aplicar las migraciones 0018 y 0019 en producción.** Sin la 0019, eliminar la cuenta falla.
2. **Política de privacidad pública.** Las dos tiendas piden una URL, por ejemplo `/privacidad`. Debe decir:
   - qué datos se guardan: correo, biblioteca, notas, fotos y uso de IA;
   - con quién se comparten: Supabase/Lovable Cloud, el proveedor de IA y Whop;
   - cómo se borran los datos.
3. **Página pública para pedir el borrado.** Google Play exige un enlace para quien ya no tiene la app. Puede ser una sección de la política con el correo de contacto, además de la opción en Ajustes.
4. **Cuentas de desarrollador.**
   - Google Play Console: 25 USD, pago único.
   - Apple Developer Program: 99 USD al año. Como organización necesita número D-U-N-S.
5. **Iconos y pantalla de inicio.** Se generan con `npx @capacitor/assets generate` a partir de dos archivos en `assets/`:
   - `icon.png` de 1024×1024;
   - `splash.png` de 2732×2732.
6. **Ficha de cada tienda.**
   - Nombre, subtítulo y descripción corta y larga.
   - Capturas: teléfono 6,7" y 6,5" para iOS; teléfono para Android.
   - Categoría: Libros y referencias.
   - Clasificación por edad y correo de soporte.
7. **Formularios de privacidad.** En Google es «Seguridad de los datos» y en Apple «Etiquetas de privacidad». Se declaran el correo (cuenta), el contenido del usuario (notas y fotos) y los identificadores de uso.
8. **Cuenta de prueba para la revisión de Apple y Google.** Un correo y una contraseña con libros cargados. Se entregan en el formulario de la tienda, nunca en el repositorio.
9. **Riesgo de rechazo de Apple por «solo un sitio web» (4.2).** Para mitigarlo, conviene sumar funciones nativas antes del envío: notificaciones de racha y del Adviento, y el escáner con la cámara nativa.

## Compilar

Android (Windows o Mac, con Android Studio):

```powershell
npm run mobile:sync
npm run mobile:android
```

En Android Studio: Build → Generate Signed App Bundle → `.aab`. Se sube a Play Console, primero a «Prueba interna». Guarda la llave de firma fuera del repositorio.

iOS (solo en Mac, con Xcode):

```bash
npm run mobile:sync
npm run mobile:ios
```

En Xcode: elige el equipo de firma, sube «Version» y «Build», y luego Product → Archive → Distribute App → App Store Connect → TestFlight.

## Más adelante

- Inicio con Google nativo (Credential Manager en Android, Google Sign-In en iOS) y, con él, «Iniciar sesión con Apple».
- Compras dentro de la app si se quiere vender Pro desde la app: StoreKit, Google Play Billing o RevenueCat, conciliado con la tabla `memberships`.
- Notificaciones push (`@capacitor/push-notifications`) para la racha y las ventanas del Adviento.
