import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Alert, Modal, FlatList, Pressable, ScrollView, Platform } from 'react-native';
import { Text, Button, TextInput, Card, Divider, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Batch {
  id: number;
  batchNumber: string;
  productName: string;
  status: string;
}

export default function ConsumeScreen() {
  const router = useRouter();

  const [activeBatches, setActiveBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [quantityGrams, setQuantityGrams] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estados para modal de selección
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActiveBatches = useCallback(async () => {
    try {
      setLoadingBatches(true);
      const response = await api.get('/batches');
      setActiveBatches(response.data || []);
    } catch (err: any) {
      console.error('Error fetching active batches', err);
      Alert.alert('Error', 'No se pudo cargar la lista de lotes activos.');
    } finally {
      setLoadingBatches(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveBatches();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchActiveBatches]);

  const handleRegisterConsumption = async () => {
    if (!selectedBatch || !quantityGrams) {
      Alert.alert('Campos Obligatorios', 'Por favor selecciona un lote e ingresa la cantidad en gramos.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/consumption', {
        batchId: selectedBatch.id,
        quantityGrams: Number(quantityGrams),
        consumptionDate: new Date().toISOString()
      });

      Alert.alert(
        'Consumo Registrado',
        'Tu ingesta nutricional se ha guardado correctamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error al registrar el consumo.';
      
      // Mostrar alerta destructiva de colisión de alérgenos o lote retirado
      Alert.alert(
        '⚠️ Alerta de Consumo',
        errorMsg,
        [{ text: 'Entendido' }]
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filtrar lotes por consulta de búsqueda
  const filteredBatches = activeBatches.filter(
    (b) =>
      b.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </Pressable>
        <Text variant="titleLarge" style={styles.headerTitle}>Registrar Consumo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.formCard}>
          <Card.Content>
            {/* Lector Selector de Lotes */}
            <View style={styles.fieldGroup}>
              <Text variant="bodyMedium" style={styles.label}>Seleccionar Producto y Lote</Text>
              
              <Pressable 
                onPress={() => setIsPickerVisible(true)}
                style={styles.pickerTrigger}
              >
                <View style={{ flex: 1 }}>
                  {selectedBatch ? (
                    <>
                      <Text style={styles.selectedProductText}>{selectedBatch.productName}</Text>
                      <Text style={styles.selectedBatchText}>Lote: {selectedBatch.batchNumber}</Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>-- Toca para seleccionar un lote --</Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-down" size={24} color="#94a3b8" />
              </Pressable>
            </View>

            {/* Cantidad en Gramos */}
            <View style={styles.fieldGroup}>
              <Text variant="bodyMedium" style={styles.label}>Cantidad en gramos (g)</Text>
              <TextInput
                value={quantityGrams}
                onChangeText={setQuantityGrams}
                mode="outlined"
                keyboardType="numeric"
                placeholder="ej. 40"
                style={styles.input}
                textColor="#fff"
                disabled={submitting}
              />
            </View>

            <Button
              mode="contained"
              onPress={handleRegisterConsumption}
              loading={submitting}
              disabled={submitting}
              style={styles.submitButton}
              labelStyle={styles.submitButtonLabel}
            >
              Registrar Ingesta
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Modal / Selector de Lotes Autocompletado */}
      <Modal
        visible={isPickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>Seleccionar Lote Activo</Text>
              <Pressable onPress={() => setIsPickerVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Buscador */}
            <Searchbar
              placeholder="Buscar producto o lote..."
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
              iconColor="#10b981"
              inputStyle={{ color: '#fff' }}
              placeholderTextColor="#64748b"
            />

            {/* Lista de Lotes */}
            {loadingBatches ? (
              <View style={styles.modalLoading}>
                <Text style={{ color: '#94a3b8' }}>Cargando lotes...</Text>
              </View>
            ) : filteredBatches.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={{ color: '#64748b' }}>No se encontraron lotes activos.</Text>
              </View>
            ) : (
              <FlatList
                data={filteredBatches}
                keyExtractor={(item) => item.id.toString()}
                ItemSeparatorComponent={() => <Divider style={styles.divider} />}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => {
                      setSelectedBatch(item);
                      setIsPickerVisible(false);
                      setSearchQuery('');
                    }}
                    style={styles.batchItem}
                  >
                    <Text variant="bodyLarge" style={styles.batchItemProduct}>{item.productName}</Text>
                    <Text variant="bodySmall" style={styles.batchItemNumber}>Lote: {item.batchNumber}</Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
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
  content: {
    padding: 20,
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
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 15,
  },
  selectedProductText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedBatchText: {
    color: '#10b981',
    fontSize: 12,
    marginTop: 2,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#0a0f1d',
  },
  submitButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 10,
  },
  submitButtonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchBar: {
    backgroundColor: '#0a0f1d',
    borderRadius: 8,
    marginBottom: 20,
  },
  batchItem: {
    paddingVertical: 16,
  },
  batchItemProduct: {
    color: '#fff',
    fontWeight: 'bold',
  },
  batchItemNumber: {
    color: '#94a3b8',
    marginTop: 2,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalLoading: {
    alignItems: 'center',
    padding: 40,
  },
  modalEmpty: {
    alignItems: 'center',
    padding: 40,
  },
});
