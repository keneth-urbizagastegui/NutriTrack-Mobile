import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, Alert, Platform, Pressable } from 'react-native';
import { Text, Card, Badge, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import * as WebBrowser from 'expo-web-browser';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';

interface TimelineStep {
  ingredientName: string;
  supplierName: string;
  arrivalDate: string;
  freshness: 'FRESH' | 'MATURING' | 'EXPIRED';
}

interface Certificate {
  laboratoryName: string;
  documentUrl: string;
  issueDate: string;
}

interface TraceabilityData {
  batchId: number;
  batchNumber: string;
  productName: string;
  status: 'ACTIVE' | 'RECALLED';
  productionDate: string;
  expirationDate: string;
  timeline: TimelineStep[];
  certificates: Certificate[];
}

// Coordenadas locales realistas en Lima para los proveedores sembrados
const SUPPLIER_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "Lácteos del Sur S.A.": { latitude: -12.2155, longitude: -76.8741 }, // Lurín
  "Global Chemical Import": { latitude: -12.0232, longitude: -77.1242 }, // Callao
  "Distribuidora NutriFit": { latitude: -12.1852, longitude: -77.0143 }, // Chorrillos
  "Envases Lima S.A.": { latitude: -12.0156, longitude: -77.0722 }, // SMP
  "Sabores del Mundo S.A.": { latitude: -12.0435, longitude: -76.9242 }, // Ate
};

export default function TraceabilityScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const router = useRouter();

  const [data, setData] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTraceability = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/batches/${batchId}/traceability`);
      setData(response.data);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron recuperar los detalles de trazabilidad del lote.');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchTraceability();
    }
  }, [batchId]);

  const handleOpenCertificate = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'No se pudo abrir el certificado de laboratorio.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Recuperando trazabilidad...</Text>
      </View>
    );
  }

  if (!data) return null;

  // Extraer las coordenadas geográficas de los proveedores del lote
  const mapMarkers = data.timeline.map((step, idx) => {
    const coords = SUPPLIER_COORDINATES[step.supplierName] || { 
      latitude: -12.046374 + (idx * 0.02), 
      longitude: -77.042793 - (idx * 0.02) 
    }; // fallback con offset
    return {
      id: idx,
      name: step.supplierName,
      ingredient: step.ingredientName,
      ...coords
    };
  });

  // Centro aproximado de Lima Metropolitana
  const mapRegion = {
    latitude: -12.100000,
    longitude: -77.030000,
    latitudeDelta: 0.35,
    longitudeDelta: 0.35,
  };

  const isRecalled = data.status === 'RECALLED';

  return (
    <View style={styles.container}>
      {/* Header fijo */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text variant="titleLarge" style={styles.headerTitle}>Trazabilidad de Lote</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cabecera del Lote */}
        <Card style={[styles.card, isRecalled && styles.recalledCard]}>
          <Card.Content>
            <View style={styles.badgeRow}>
              <Badge 
                style={[styles.statusBadge, isRecalled ? styles.badgeRecalled : styles.badgeActive]}
              >
                {isRecalled ? 'LOTE RETIRADO (RECALLED)' : 'LOTE ACTIVO'}
              </Badge>
            </View>

            <Text variant="headlineSmall" style={styles.productName}>{data.productName}</Text>
            <Text variant="bodyLarge" style={styles.batchNumber}>Lote: {data.batchNumber}</Text>
            
            {isRecalled && (
              <View style={styles.recalledAlert}>
                <MaterialCommunityIcons name="alert-decagram" size={20} color="#f43f5e" />
                <Text style={styles.recalledAlertText}>
                  ¡ADVERTENCIA! Este lote ha sido bloqueado del mercado por problemas sanitarios o de control de calidad. No lo consumas.
                </Text>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.dateRow}>
              <View style={styles.dateCol}>
                <Text variant="bodySmall" style={styles.dateLabel}>Producción</Text>
                <Text variant="bodyMedium" style={styles.dateValue}>{data.productionDate}</Text>
              </View>
              <View style={styles.dateCol}>
                <Text variant="bodySmall" style={styles.dateLabel}>Vencimiento</Text>
                <Text variant="bodyMedium" style={styles.dateValue}>{data.expirationDate}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Línea de Tiempo de Ingredientes */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Línea de Tiempo de Ingredientes</Text>
        <Card style={styles.card}>
          <Card.Content>
            {data.timeline.map((step, idx) => {
              const isFresh = step.freshness === 'FRESH';
              const isMaturing = step.freshness === 'MATURING';
              const freshnessColor = isFresh ? '#10b981' : isMaturing ? '#06b6d4' : '#eab308';
              const freshnessText = isFresh ? 'Fresco' : isMaturing ? 'Maduro' : 'Expirado';

              return (
                <View key={idx}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineIndicatorCol}>
                      <View style={[styles.timelineDot, { backgroundColor: freshnessColor }]} />
                      {idx < data.timeline.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    
                    <View style={styles.timelineDetails}>
                      <View style={styles.timelineItemHeader}>
                        <Text variant="bodyLarge" style={styles.ingredientName}>{step.ingredientName}</Text>
                        <Badge style={[styles.freshnessBadge, { backgroundColor: freshnessColor + '20', color: freshnessColor, borderColor: freshnessColor + '40', borderWidth: 1 }]}>
                          {freshnessText}
                        </Badge>
                      </View>
                      <Text variant="bodySmall" style={styles.timelineMeta}>Proveedor: {step.supplierName}</Text>
                      <Text variant="bodySmall" style={styles.timelineMeta}>Llegada a Planta: {step.arrivalDate}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>

        {/* Mapa Geográfico de Proveedores */}
        <Text variant="titleMedium" style={styles.sectionTitle}>Geolocalización de Proveedores</Text>
        <Card style={styles.card}>
          <Card.Content style={{ padding: 0 }}>
            <View style={styles.mapWrapper}>
              <MapView 
                style={styles.map} 
                initialRegion={mapRegion}
                userInterfaceStyle="dark"
              >
                {mapMarkers.map((marker) => (
                  <Marker
                    key={marker.id}
                    coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                    title={marker.name}
                    description={`Insumo: ${marker.ingredient}`}
                    pinColor="#10b981"
                  />
                ))}
              </MapView>
            </View>
          </Card.Content>
        </Card>

        {/* Certificados de Laboratorio */}
        {data.certificates && data.certificates.length > 0 && (
          <>
            <Text variant="titleMedium" style={styles.sectionTitle}>Certificados de Laboratorio</Text>
            {data.certificates.map((cert, idx) => (
              <Card key={idx} style={styles.certCard}>
                <Card.Content style={styles.certContent}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={{ color: '#fff', fontWeight: 'bold' }}>{cert.laboratoryName}</Text>
                    <Text variant="bodySmall" style={{ color: '#64748b', marginTop: 2 }}>Emitido: {cert.issueDate}</Text>
                  </View>
                  <Button 
                    mode="text" 
                    onPress={() => handleOpenCertificate(cert.documentUrl)}
                    textColor="#10b981"
                    icon="file-pdf-box"
                  >
                    Ver PDF
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {/* Botón para reportar problemas de calidad */}
        <Button
          mode="outlined"
          onPress={() => router.push(`/report/${batchId}`)}
          style={styles.reportButton}
          textColor="#f43f5e"
          icon="shield-alert"
        >
          Reportar Problema de Calidad
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020817',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
    overflow: 'hidden',
  },
  recalledCard: {
    borderColor: '#f43f5e',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  badgeActive: {
    backgroundColor: '#10b981',
    color: '#fff',
  },
  badgeRecalled: {
    backgroundColor: '#f43f5e',
    color: '#fff',
  },
  productName: {
    color: '#fff',
    fontWeight: '900',
  },
  batchNumber: {
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: 'bold',
  },
  recalledAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  recalledAlertText: {
    color: '#f43f5e',
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 16,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCol: {
    width: '48%',
  },
  dateLabel: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  dateValue: {
    color: '#fff',
    marginTop: 4,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineIndicatorCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    backgroundColor: '#334155',
    flex: 1,
    position: 'absolute',
    top: 18,
    bottom: -18,
    left: 11,
  },
  timelineDetails: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 20,
  },
  timelineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientName: {
    color: '#fff',
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  freshnessBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    borderRadius: 4,
  },
  timelineMeta: {
    color: '#64748b',
    marginTop: 2,
  },
  mapWrapper: {
    height: 250,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  certCard: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 12,
  },
  certContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  reportButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f43f5e',
    paddingVertical: 4,
    marginTop: 10,
  },
});
