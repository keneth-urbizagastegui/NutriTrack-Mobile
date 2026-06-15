# NutriTrack Mobile - Aplicación Móvil de Trazabilidad Alimentaria y Fitness

## Información del Curso y Equipo
* **Curso:** CS 2031 Desarrollo Basado en Plataforma (DBP) - UTEC
* **Integrantes del Equipo:**
  * Víctor Valentino Palomino Arcos
  * Nestor Alonso De la Cruz Gomez
  * Keneth Joseph Urbizagastegui Fernández

---

## Índice
1. [Introducción](#introducción)
2. [Descripción de la Solución Móvil](#descripción-de-la-solución-móvil)
3. [Tecnologías y Librerías Utilizadas](#tecnologías-y-librerías-utilizadas)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Arquitectura de Seguridad: Zustand + SecureStore](#arquitectura-de-seguridad-zustand--securestore)
6. [Integración de Sensores Nativos](#integración-de-sensores-nativos)
7. [Instrucciones de Instalación y Ejecución Local](#instrucciones-de-instalación-y-ejecución-local)
8. [Configuración de Red y Variables de Entorno](#configuración-de-red-y-variables-de-entorno)
9. [Guía de Pruebas Extremo a Extremo (Set de Pruebas)](#guía-de-pruebas-extremo-a-extremo-set-de-pruebas)
10. [Conclusiones](#conclusiones)

---

## Introducción
**NutriTrack Mobile** es la aplicación móvil nativa del ecosistema NutriTrack, diseñada específicamente para el deportista / consumidor final. Actúa como una herramienta de bolsillo que permite a los usuarios monitorear sus objetivos de macronutrientes diarios, registrar ingestas de alimentos de forma segura y transparente, y auditar la procedencia de los suplementos deportivos directamente en el punto de consumo utilizando hardware y sensores nativos del dispositivo móvil.

---

## Descripción de la Solución Móvil
A diferencia del panel web (diseñado para la administración y control logístico en pantallas de escritorio), la aplicación móvil se enfoca en resolver las necesidades críticas del atleta mediante una experiencia de usuario (UX) premium optimizada para pantallas táctiles y sensores nativos:
* **Dashboard de Macros en Tiempo Real:** Visualización gráfica circular del avance diario de calorías, proteínas, carbohidratos y grasas con historial de consumo inmediato.
* **Registro Inteligente de Consumo:** Selector dinámico conectado a la API de lotes activos (`/api/v1/batches`), que valida de forma automatizada alérgenos registrados y lotes bloqueados del mercado.
* **Escaneo QR de Trazabilidad Novedosa (Cámara):** Escaneo nativo del código QR impreso en el producto para redirigir automáticamente al deportista al historial completo de procedencia del lote.
* **Geolocalización de Plantas Proveedoras (Mapas):** Visualización interactiva mediante mapas para ubicar geográficamente las plantas físicas de los proveedores de insumos del lote.
* **Reporte de Calidad Georreferenciado (Localización GPS):** Envío de incidencias sanitarias sobre lotes defectuosos capturando de forma precisa y automática la latitud/longitud física del usuario al momento de la queja.

---

## Tecnologías y Librerías Utilizadas
* **Framework:** React Native + Expo (SDK 56) con TypeScript
* **Navegación:** Expo Router (Bottom Tabs & Stack Routing dinámico basado en archivos)
* **Estado Global:** Zustand (Tienda reactiva descentralizada)
* **Almacenamiento Seguro (Cifrado local):** `expo-secure-store` (Llaveros de seguridad de hardware Keychain en iOS y Keystore en Android)
* **Cliente HTTP:** Axios (con interceptores para silent refresh tokens y adjuntado automático de cabeceras Bearer)
* **Sensores de Hardware Integrados:**
  * `expo-camera` (Acceso nativo a la cámara para lectura ultra rápida de códigos QR)
  * `expo-location` (Obtención asíncrona de coordenadas GPS con precisión equilibrada)
  * `react-native-maps` (Renderizado nativo de mapas interactivos con marcadores físicos)
* **Diseño Visual:** React Native Paper (Diseño Premium Glassmorphism con acento neón fitness)

---

## Estructura del Proyecto
La aplicación sigue una arquitectura limpia basada en Expo Router con separación clara de componentes lógicos y vistas:
```
NutriTrack Mobile/
├── assets/                  # Iconos, imágenes y recursos estáticos de la marca
├── src/
│   ├── app/                 # Enrutamiento basado en archivos (Expo Router)
│   │   ├── (auth)/          # Grupo de navegación de autenticación (Login / Registro)
│   │   ├── (tabs)/          # Navegación del Bottom Tab principal (Home, Scan, Perfil)
│   │   ├── report/          # Pantalla dinámica del reporte de calidad ([batchId])
│   │   ├── traceability/    # Pantalla dinámica de la trazabilidad del lote ([batchId])
│   │   ├── _layout.tsx      # Configuración de inicialización, temas e hidratación
│   │   └── consume.tsx      # Pantalla/Modal de registro de consumo de lotes activos
│   ├── components/          # Componentes visuales y layouts reutilizables
│   ├── constants/           # Definición de tokens de diseño y colores del tema
│   ├── services/            # Cliente API centralizado (api.ts) y mapeos
│   ├── store/               # Tienda global de autenticación de Zustand (useAuthStore.ts)
│   └── global.d.ts          # Declaración de tipos TypeScript para CSS y variables
├── app.json                 # Configuración del proyecto Expo (SDK 56)
├── package.json             # Dependencias del proyecto
└── tsconfig.json            # Configuración de TypeScript
```

---

## Arquitectura de Seguridad: Zustand + SecureStore
Para cumplir con los estándares de seguridad móvil (Directrices de OWASP Mobile), los tokens de seguridad JWT de sesión (`accessToken` y `refreshToken`) y la información del usuario no se almacenan en texto plano en la memoria del dispositivo.

Hemos implementado un mecanismo de persistencia cifrada nativa:
* **useAuthStore:** Utiliza la API de **Zustand** para la reactividad en el frontend.
* **Persistencia Segura:** Las mutaciones de estado se guardan de forma asíncrona y cifrada en el sistema de almacenamiento seguro nativo del sistema operativo mediante `SecureStore.setItemAsync` de Expo.
* **Hidratación Automática:** Al abrir la aplicación, el layout raíz ([_layout.tsx](file:///c:/Users/Keneth/Desktop/Proyecto%20DBP/NutriTrack%20Mobile/src/app/_layout.tsx)) ejecuta el método `hydrate()` que recupera de forma segura los tokens cifrados y autoriza inmediatamente al usuario sin pedir credenciales adicionales.

---

## Integración de Sensores Nativos

### 1. Cámara Novedosa (QR Scanner)
Configurado en [scan.tsx](file:///c:/Users/Keneth/Desktop/Proyecto%20DBP/NutriTrack%20Mobile/src/app/(tabs)/scan.tsx). Utiliza el componente `<CameraView>` nativo de `expo-camera`.
* Detecta códigos de tipo QR.
* Extrae el ID del lote mediante expresiones regulares en la URL codificada.
* Navega automáticamente al usuario a la vista de trazabilidad física del producto.

### 2. Mapas Interactivos (Geolocalización de Proveedores)
Configurado en [traceability/[batchId].tsx](file:///c:/Users/Keneth/Desktop/Proyecto%20DBP/NutriTrack%20Mobile/src/app/traceability/[batchId].tsx). Utiliza el mapa nativo de `react-native-maps`.
* Renderiza el mapa interactivo de la zona correspondiente.
* Coloca marcadores (`<Marker>`) dinámicos representando las coordenadas físicas de latitud/longitud de las plantas productoras donde se adquirió la materia prima de ese lote.

### 3. Localización GPS (Reporte de Calidad)
Configurado en [report/[batchId].tsx](file:///c:/Users/Keneth/Desktop/Proyecto%20DBP/NutriTrack%20Mobile/src/app/report/[batchId].tsx). Utiliza la API de localización física `expo-location`.
* Solicita permisos de ubicación fina del dispositivo.
* Captura de forma asíncrona y precisa la ubicación actual del usuario (`getCurrentPositionAsync`).
* Adjunta estas coordenadas al payload JSON enviado al backend para mapear geográficamente las denuncias de calidad en lotes sospechosos.

---

## Instrucciones de Instalación y Ejecución Local

### Prerrequisitos
* Tener instalado **Node.js** (versión 18 o superior).
* Tener configurado el celular con la aplicación **Expo Go** (Play Store o App Store) o un emulador de Android/iOS corriendo.

### Preparación
1. Navega al directorio móvil e instala las dependencias:
   ```bash
   cd "NutriTrack Mobile"
   npm install
   ```

2. Ejecuta el servidor de desarrollo de Metro:
   ```bash
   npm run start
   ```
   *Nota: Si el puerto por defecto `8081` está en uso por otro proceso, arráncalo en el puerto `8082`:*
   ```bash
   npx expo start --port 8082
   ```

3. Escanea el código QR que se imprime en tu consola:
   * **En Android:** Abre la app **Expo Go** y usa la opción de escanear QR.
   * **En iOS (iPhone):** Abre la cámara de fotos nativa y escanea el QR.

---

## Configuración de Red y Variables de Entorno
Para que el celular físico pueda conectarse con el servidor backend ejecutado en tu PC de forma local, debes indicarle tu IP local (dentro de tu red Wi-Fi compartida).

1. Crea un archivo `.env` en la raíz de `NutriTrack Mobile`:
   ```env
   EXPO_PUBLIC_API_URL=http://<IP_LOCAL_DE_TU_PC>:8080/api/v1
   ```
   *(Ejemplo: `EXPO_PUBLIC_API_URL=http://192.168.1.34:8080/api/v1`)*

El cliente HTTP de Axios en [api.ts](file:///c:/Users/Keneth/Desktop/Proyecto%20DBP/NutriTrack%20Mobile/src/services/api.ts) cargará automáticamente esta configuración.

---

## Guía de Pruebas Extremo a Extremo (Set de Pruebas)

### Prueba 1: Registro e Inicio de Sesión
1. Inicia la app y entra a **Regístrate aquí**. Ingresa tus datos (valida la fuerza de la contraseña) y regístrate.
2. Inicia sesión con el usuario de prueba `victor.fitness` y la contraseña `StrongPassword123!`.
3. Cierra la app y vuelve a abrirla. Verifica que no te solicite credenciales y cargue tu perfil directamente.

### Prueba 2: Registro de Consumos & Restricción de Alérgenos
1. Abre el modal de **Registrar Consumo**.
2. Selecciona del desplegable la `Barra de Proteína con Maní (Lote: PEANUT-BAR-404)` e ingresa `30g`.
3. Presiona registrar. Valida que el sistema bloquea el consumo y muestra una alerta roja notificando colisión de alérgenos por el Maní registrado en tu perfil.
4. Selecciona `Creatina Monohidratada Pure (Lote: CRE-202)` e ingresa `5g`. Presiona registrar y verifica que se guarde con éxito y actualice el gráfico del dashboard.

### Prueba 3: Auditoría y Escaneo QR (Cámara)
1. Ve a la pestaña **Scan** de la app y otorga permisos de cámara.
2. Escanea un QR con la URL `https://nutritrack.app/traceability/2`.
3. Verifica que la app te redirige automáticamente a la pantalla de trazabilidad detallada del Lote 2 de Creatina.

### Prueba 4: Mapa de Proveedores y GPS
1. En la pantalla del lote, revisa que se muestre el mapa interactivo con la ubicación del proveedor.
2. Presiona **Reportar Problema de Calidad**. Rellena el formulario de queja y envíalo.
3. Valida en la base de datos o en la consola del backend que la incidencia se registró exitosamente incluyendo las coordenadas de latitud/longitud precisas capturadas por el GPS de tu teléfono.

---

## Conclusiones
El desarrollo de **NutriTrack Mobile** consolida un ecosistema seguro, moderno y completo de trazabilidad:
1. **Seguridad Robusta:** Utilizando encriptación en hardware real a través del Keystore/Keychain nativo con `expo-secure-store` y Zustand.
2. **Acceso Nativo Eficiente:** Uso óptimo de la cámara, mapas y GPS para brindar una experiencia de usuario que la web tradicional no puede replicar.
3. **Consistencia de Datos:** Integración limpia con el backend a través de interceptores HTTP inteligentes de Axios que resuelven refrescos de tokens silenciosos y toleran cambios de red locales.
