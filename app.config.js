module.exports = {
  expo: {
    name: "nutritrack-mobile",
    slug: "nutritrack-mobile",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "nutritrackmobile",
    userInterfaceStyle: "automatic",
    ios: {
      icon: "./assets/expo.icon",
      infoPlist: {
        NSCameraUsageDescription: "Requerimos acceso a la cámara para poder escanear los códigos QR de los productos y verificar su trazabilidad.",
        NSLocationWhenInUseUsageDescription: "Requerimos acceso a tu ubicación GPS para adjuntar coordenadas de geolocalización al reportar un problema de calidad de lote."
      }
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#208AEF",
          android: {
            image: "./assets/images/splash-icon.png",
            imageWidth: 76
          }
        }
      ],
      "expo-secure-store"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    }
  }
};
