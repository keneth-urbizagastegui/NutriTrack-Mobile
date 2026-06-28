import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Alert, Platform, Pressable, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../services/api';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function CreateReportScreen() {
  const { batchId } = useLocalSearchParams<{ batchId: string }>();
  const router = useRouter();

  const [batchNumber, setBatchNumber] = useState('');
  const [productName, setProductName] = useState('');
  const [loadingBatch, setLoadingBatch] = useState(true);

  // Estados del Formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatchDetails = useCallback(async () => {
    try {
      setLoadingBatch(true);
      const response = await api.get(`/batches/${batchId}/traceability`);
      setBatchNumber(response.data.batchNumber);
      setProductName(response.data.productName);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'No se pudieron recuperar los detalles del lote.');
      router.back();
    } finally {
      setLoadingBatch(false);
    }
  }, [batchId, router]);

  useEffect(() => {
    if (batchId) {
      const timer = setTimeout(() => {
        fetchBatchDetails();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [batchId, fetchBatchDetails]);

  const handleSubmitReport = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Campos Obligatorios', 'Por favor completa todos los campos del reporte.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Solicitar permisos de GPS y obtener ubicación
      let locationText = '';
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          locationText = `\n\n[Ubicación GPS del Reporte: Lat ${location.coords.latitude.toFixed(6)}, Lon ${location.coords.longitude.toFixed(6)}]`;
        } else {
          console.warn('Permiso de GPS denegado por el usuario.');
        }
      } catch (locationError) {
        console.error('Error al capturar GPS', locationError);
      }

      // 2. Enviar el reporte anexando las coordenadas al final de la descripción
      const finalDescription = description + locationText;

      await api.post(`/batches/${batchId}/quality-reports`, {
        title,
        description: finalDescription,
      });

      Alert.alert(
        'Reporte Registrado',
        'El reporte de calidad se registró exitosamente y fue notificado a los administradores.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error al enviar el reporte.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingBatch) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#94a3b8' }}>Verificando lote...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text variant="titleLarge" style={styles.headerTitle}>Reportar Lote</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ficha informativa del lote */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoTitleRow}>
              <MaterialCommunityIcons name="shield-alert" size={24} color="#f43f5e" />
              <Text variant="titleMedium" style={styles.infoTitle}>Lote en Observación</Text>
            </View>
            <View style={styles.infoDetails}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Producto</Text>
                <Text style={styles.infoValue}>{productName}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>Lote</Text>
                <Text style={styles.infoValue}>{batchNumber}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Formulario */}
        <Card style={styles.formCard}>
          <Card.Content>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Asunto / Título del Defecto</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                mode="outlined"
                placeholder="ej. Presencia de partículas oscuras en el polvo"
                style={styles.input}
                textColor="#fff"
                disabled={submitting}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Descripción Detallada</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={6}
                placeholder="Describe el defecto, sabor, olor o anomalía física encontrada en el producto..."
                style={styles.textarea}
                textColor="#fff"
                disabled={submitting}
              />
            </View>

            <View style={styles.gpsNote}>
              <MaterialCommunityIcons name="map-marker-radius" size={16} color="#10b981" />
              <Text style={styles.gpsNoteText}>
                Se adjuntará automáticamente tu ubicación GPS al enviar el reporte para trazabilidad geográfica.
              </Text>
            </View>

            <Button
              mode="contained"
              onPress={handleSubmitReport}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            >
              Enviar Reporte
            </Button>
          </Card.Content>
        </Card>
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
  infoCard: {
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderRadius: 16,
    marginBottom: 20,
  },
  infoTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    color: '#f43f5e',
    fontWeight: 'bold',
  },
  infoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    width: '48%',
  },
  infoLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  infoValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#0a0f1d',
  },
  textarea: {
    backgroundColor: '#0a0f1d',
    textAlignVertical: 'top',
  },
  gpsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  gpsNoteText: {
    color: '#10b981',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#f43f5e',
    borderRadius: 8,
    paddingVertical: 6,
  },
  submitButtonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});
