import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, FlatList, RefreshControl, Pressable } from 'react-native';
import { Text, Button, Card, ProgressBar, useTheme, Surface } from 'react-native-paper';
import { useRouter, useNavigation } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ConsumptionLog {
  id: number;
  productName: string;
  quantityGrams: number;
  consumptionDate: string;
  consumedMacros: {
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [history, setHistory] = useState<ConsumptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyMacros, setDailyMacros] = useState({ protein: 0, carbs: 0, fat: 0, calories: 0 });

  // Objetivos de macros (fijados como estándar para deportistas)
  const targets = { protein: 150, carbs: 200, fat: 70, calories: 2000 };

  const fetchConsumption = async () => {
    try {
      setLoading(true);
      const response = await api.get('/consumption', {
        params: { page: 0, size: 10, sort: 'consumptionDate,desc' }
      });
      const logs = response.data.content || [];
      setHistory(logs);

      // Calcular macros del día
      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = logs.filter((log: ConsumptionLog) => 
        log.consumptionDate.startsWith(todayStr)
      );

      const totals = todayLogs.reduce((acc: any, curr: ConsumptionLog) => {
        acc.protein += curr.consumedMacros.protein;
        acc.carbs += curr.consumedMacros.carbs;
        acc.fat += curr.consumedMacros.fat;
        return acc;
      }, { protein: 0, carbs: 0, fat: 0 });

      const calories = Math.round(totals.protein * 4 + totals.carbs * 4 + totals.fat * 9);
      setDailyMacros({
        protein: Math.round(totals.protein * 10) / 10,
        carbs: Math.round(totals.carbs * 10) / 10,
        fat: Math.round(totals.fat * 10) / 10,
        calories
      });
    } catch (err: any) {
      console.error('Error fetching consumption history', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConsumption();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsumption();
  };

  // Escucha cuando la pantalla vuelve a tener foco para refrescar
  // En Expo Router/React Navigation podemos usar hooks de navegación, o simplemente refrescar al abrir el modal
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConsumption();
    }, 5000); // Auto-refresca cada 5s para sincronización en tiempo real
    return () => clearInterval(interval);
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
      }
    >
      {/* Saludo inicial */}
      <View style={styles.welcomeSection}>
        <Text variant="headlineSmall" style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
        <Text variant="bodyMedium" style={styles.dateText}>
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </Text>
      </View>

      {/* Tarjeta de Calorías y Progreso */}
      <Card style={styles.macroCard} contentStyle={styles.macroCardContent}>
        <View style={styles.calorieRow}>
          <View>
            <Text variant="displaySmall" style={styles.calorieValue}>{dailyMacros.calories}</Text>
            <Text variant="labelMedium" style={styles.calorieLabel}>Kcal Consumidas de {targets.calories}</Text>
          </View>
          <View style={styles.flameContainer}>
            <MaterialCommunityIcons name="fire" size={48} color="#f97316" />
          </View>
        </View>
        
        <ProgressBar 
          progress={Math.min(dailyMacros.calories / targets.calories, 1)} 
          color="#10b981" 
          style={styles.mainProgress} 
        />

        {/* Progreso de Macronutrientes individuales */}
        <View style={styles.individualMacros}>
          {/* Proteína */}
          <View style={styles.macroCol}>
            <View style={styles.macroColHeader}>
              <Text variant="bodySmall" style={styles.macroName}>Proteínas</Text>
              <Text variant="bodySmall" style={styles.macroStat}>{dailyMacros.protein}g / {targets.protein}g</Text>
            </View>
            <ProgressBar 
              progress={Math.min(dailyMacros.protein / targets.protein, 1)} 
              color="#10b981" 
              style={styles.macroBar} 
            />
          </View>

          {/* Carbos */}
          <View style={styles.macroCol}>
            <View style={styles.macroColHeader}>
              <Text variant="bodySmall" style={styles.macroName}>Carbohidratos</Text>
              <Text variant="bodySmall" style={styles.macroStat}>{dailyMacros.carbs}g / {targets.carbs}g</Text>
            </View>
            <ProgressBar 
              progress={Math.min(dailyMacros.carbs / targets.carbs, 1)} 
              color="#06b6d4" 
              style={styles.macroBar} 
            />
          </View>

          {/* Grasa */}
          <View style={styles.macroCol}>
            <View style={styles.macroColHeader}>
              <Text variant="bodySmall" style={styles.macroName}>Grasas</Text>
              <Text variant="bodySmall" style={styles.macroStat}>{dailyMacros.fat}g / {targets.fat}g</Text>
            </View>
            <ProgressBar 
              progress={Math.min(dailyMacros.fat / targets.fat, 1)} 
              color="#eab308" 
              style={styles.macroBar} 
            />
          </View>
        </View>
      </Card>

      {/* Botón de Registro Rápido */}
      <Button 
        mode="contained" 
        onPress={() => router.push('/consume')} 
        style={styles.consumeButton}
        icon="plus-circle"
      >
        Registrar Consumo
      </Button>

      {/* Historial de Ingestas de Hoy */}
      <View style={styles.historySection}>
        <Text variant="titleMedium" style={styles.historyTitle}>Historial de Ingestas Recientes</Text>
        {loading && history.length === 0 ? (
          <Text style={styles.emptyText}>Cargando consumos...</Text>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={40} color="#64748b" />
            <Text style={styles.emptyText}>Aún no registras consumos hoy.</Text>
            <Text style={styles.emptySubText}>Escanear el QR o ingresa un consumo usando el botón superior.</Text>
          </View>
        ) : (
          history.map((item) => (
            <Card key={item.id} style={styles.logCard}>
              <Card.Content style={styles.logCardContent}>
                <View style={styles.logHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge" style={styles.logProductName}>{item.productName}</Text>
                    <Text variant="bodySmall" style={styles.logDate}>
                      {new Date(item.consumptionDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} • {item.quantityGrams}g
                    </Text>
                  </View>
                  <View style={styles.logMacrosBadge}>
                    <Text style={styles.logMacrosText}>P: {Math.round(item.consumedMacros.protein)}g</Text>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcomeSection: {
    marginBottom: 20,
  },
  welcomeText: {
    fontWeight: '900',
    color: '#fff',
  },
  dateText: {
    color: '#94a3b8',
    textTransform: 'capitalize',
    marginTop: 2,
  },
  macroCard: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 4,
  },
  macroCardContent: {
    padding: 0,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieValue: {
    fontWeight: '900',
    color: '#fff',
  },
  calorieLabel: {
    color: '#64748b',
    marginTop: 4,
  },
  flameContainer: {
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    padding: 10,
    borderRadius: 12,
  },
  mainProgress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e293b',
    marginBottom: 24,
  },
  individualMacros: {
    gap: 16,
  },
  macroCol: {
    width: '100%',
  },
  macroColHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  macroName: {
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  macroStat: {
    color: '#94a3b8',
  },
  macroBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1e293b',
  },
  consumeButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 6,
    marginBottom: 24,
  },
  historySection: {
    marginTop: 8,
  },
  historyTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  logCard: {
    backgroundColor: '#0f172a',
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  logCardContent: {
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logProductName: {
    fontWeight: 'bold',
    color: '#fff',
  },
  logDate: {
    color: '#64748b',
    marginTop: 2,
  },
  logMacrosBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  logMacrosText: {
    color: '#10b981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#94a3b8',
    fontWeight: 'bold',
    marginTop: 12,
    fontSize: 15,
  },
  emptySubText: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
