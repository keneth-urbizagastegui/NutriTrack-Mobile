import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useNavigation } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const router = useRouter();
  const navigation = useNavigation();

  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const stored = await SecureStore.getItemAsync('scan_history');
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading scan history', e);
    }
  };

  // Resetear escáner y cargar historial al enfocar la pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setScanned(false);
      fetchHistory();
    });
    return unsubscribe;
  }, [navigation]);

  if (!permission) {
    return (
      <View style={styles.darkContainer}>
        <Text style={styles.loadingText}>Cargando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#64748b" style={{ marginBottom: 16 }} />
        <Text style={styles.permissionText}>Requerimos permisos de cámara para escanear los códigos QR de los productos.</Text>
        <Pressable onPress={requestPermission} style={styles.permissionButton}>
          <Text style={styles.permissionButtonText}>Otorgar Permiso</Text>
        </Pressable>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    // Extraer ID de URLs tipo: "https://nutritrack.app/traceability/1"
    const match = data.match(/\/traceability\/(\d+)/);
    if (match && match[1]) {
      const batchId = match[1];
      router.push(`/traceability/${batchId}`);
    } else {
      alert('Código QR no reconocido. Intenta con un código de lote de NutriTrack.');
      // Pequeño delay antes de habilitar el escáner de nuevo
      setTimeout(() => {
        setScanned(false);
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      {/* Guía visual (overlay) */}
      <View style={styles.overlayContainer}>
        <View style={styles.unfocusedArea} />
        <View style={styles.focusedRow}>
          <View style={styles.unfocusedArea} />
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <Text style={styles.scanLabel}>Alinea el código QR aquí</Text>
          </View>
          <View style={styles.unfocusedArea} />
        </View>
        <View style={styles.unfocusedArea} />
      </View>
      
      {scanned && (
        <View style={styles.scanAgainBox}>
          <Pressable onPress={() => setScanned(false)} style={styles.scanAgainBtn}>
            <Text style={styles.scanAgainText}>Escanear de nuevo</Text>
          </Pressable>
        </View>
      )}

      {/* Historial de Escaneos Recientes */}
      {history.length > 0 && !scanned && (
        <View style={styles.historyContainer}>
          <Pressable 
            onPress={() => setIsCollapsed(!isCollapsed)} 
            style={styles.historyHeader}
          >
            <View style={styles.historyHeaderTitle}>
              <MaterialCommunityIcons name="history" size={16} color="#10b981" />
              <Text style={styles.historyTitle}> Escaneos Recientes ({history.length})</Text>
            </View>
            <MaterialCommunityIcons 
              name={isCollapsed ? "chevron-up" : "chevron-down"} 
              size={20} 
              color="#94a3b8" 
            />
          </Pressable>
          
          {!isCollapsed && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.historyList}
              style={{ marginTop: 10 }}
            >
              {history.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.historyCard}
                  onPress={() => router.push(`/traceability/${item.batchId}`)}
                >
                  <MaterialCommunityIcons name="pill" size={20} color="#10b981" style={{ marginBottom: 4 }} />
                  <Text style={styles.historyCardName} numberOfLines={1}>{item.productName}</Text>
                  <Text style={styles.historyCardLote} numberOfLines={1}>Lote: {item.batchNumber}</Text>
                  <Text style={styles.historyCardDate}>
                    {new Date(item.scanDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkContainer: {
    flex: 1,
    backgroundColor: '#020817',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  permissionText: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
  },
  unfocusedArea: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 23, 0.6)',
  },
  focusedRow: {
    height: 250,
    flexDirection: 'row',
  },
  targetFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#10b981',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  scanLabel: {
    color: '#10b981',
    fontWeight: 'bold',
    position: 'absolute',
    bottom: -36,
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  scanAgainBox: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  scanAgainBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 4,
  },
  scanAgainText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  historyContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  historyTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 10,
    width: 140,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  historyCardName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyCardLote: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  historyCardDate: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 4,
    textAlign: 'right',
  },
});
