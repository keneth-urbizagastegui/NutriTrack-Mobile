import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, RefreshControl } from 'react-native';
import { Text, Button, Card, ProgressBar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';

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

interface RingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  index: number;
}

const MacroRing: React.FC<RingProps> = ({ progress, size, strokeWidth, color, index }) => {
  const radius = size / 2 - (index * (strokeWidth + 6)) - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 1) * circumference);

  return (
    <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        opacity={0.15}
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="transparent"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </G>
  );
};

interface ConcentricProps {
  proteinProgress: number;
  carbsProgress: number;
  fatProgress: number;
  calories: number;
  targetCalories: number;
}

const ConcentricProgressRings: React.FC<ConcentricProps> = ({
  proteinProgress,
  carbsProgress,
  fatProgress,
  calories,
  targetCalories,
}) => {
  const size = 160;
  const strokeWidth = 10;

  return (
    <View style={styles.ringWrapper}>
      <Svg width={size} height={size}>
        <MacroRing progress={proteinProgress} size={size} strokeWidth={strokeWidth} color="#10b981" index={0} />
        <MacroRing progress={carbsProgress} size={size} strokeWidth={strokeWidth} color="#06b6d4" index={1} />
        <MacroRing progress={fatProgress} size={size} strokeWidth={strokeWidth} color="#eab308" index={2} />
      </Svg>
      
      <View style={styles.ringCenterText}>
        <Text variant="headlineMedium" style={{ fontWeight: '900', color: '#fff', textAlign: 'center' }}>
          {calories}
        </Text>
        <Text variant="labelSmall" style={{ color: '#64748b', fontSize: 9, textAlign: 'center', marginTop: 2, textTransform: 'uppercase' }}>
          Kcal Hoy
        </Text>
        <Text variant="labelSmall" style={{ color: '#10b981', fontWeight: 'bold', fontSize: 9, textAlign: 'center', marginTop: 1 }}>
          Meta: {targetCalories}
        </Text>
      </View>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [history, setHistory] = useState<ConsumptionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyMacros, setDailyMacros] = useState({ protein: 0, carbs: 0, fat: 0, calories: 0 });
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const targets = { protein: 150, carbs: 200, fat: 70, calories: 2000 };

  const fetchConsumption = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 0 : page;
    if (resetPage) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/consumption', {
        params: { page: targetPage, size: 10, sort: 'consumptionDate,desc' }
      });
      const logs = response.data.content || [];
      const isLast = response.data.last;

      let newHistory: ConsumptionLog[] = [];
      if (resetPage) {
        newHistory = logs;
        setPage(1);
      } else {
        newHistory = [...history, ...logs];
        setPage(targetPage + 1);
      }
      setHistory(newHistory);
      setHasMore(!isLast);

      const todayStr = new Date().toISOString().split('T')[0];
      const todayLogs = newHistory.filter((log: ConsumptionLog) => 
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
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [page, hasMore, loadingMore, history]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchConsumption(true);
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsumption(true);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConsumption(true);
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id.toString()}
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
      }
      onEndReached={() => fetchConsumption(false)}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <>
          {/* Saludo inicial */}
          <View style={styles.welcomeSection}>
            <Text variant="headlineSmall" style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
            <Text variant="bodyMedium" style={styles.dateText}>
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>

          {/* Tarjeta de Calorías y Progreso */}
          <Card style={styles.macroCard} contentStyle={styles.macroCardContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ConcentricProgressRings
                proteinProgress={dailyMacros.protein / targets.protein}
                carbsProgress={dailyMacros.carbs / targets.carbs}
                fatProgress={dailyMacros.fat / targets.fat}
                calories={dailyMacros.calories}
                targetCalories={targets.calories}
              />
              <View style={{ flex: 1, gap: 10 }}>
                <View style={styles.macroCol}>
                  <View style={styles.macroColHeader}>
                    <Text variant="bodySmall" style={[styles.macroName, { color: '#10b981' }]}>Proteína</Text>
                    <Text variant="bodySmall" style={styles.macroStat}>{Math.round(dailyMacros.protein)}g/{targets.protein}g</Text>
                  </View>
                  <ProgressBar 
                    progress={Math.min(dailyMacros.protein / targets.protein, 1)} 
                    color="#10b981" 
                    style={styles.macroBar} 
                  />
                </View>
                <View style={styles.macroCol}>
                  <View style={styles.macroColHeader}>
                    <Text variant="bodySmall" style={[styles.macroName, { color: '#06b6d4' }]}>Carbos</Text>
                    <Text variant="bodySmall" style={styles.macroStat}>{Math.round(dailyMacros.carbs)}g/{targets.carbs}g</Text>
                  </View>
                  <ProgressBar 
                    progress={Math.min(dailyMacros.carbs / targets.carbs, 1)} 
                    color="#06b6d4" 
                    style={styles.macroBar} 
                  />
                </View>
                <View style={styles.macroCol}>
                  <View style={styles.macroColHeader}>
                    <Text variant="bodySmall" style={[styles.macroName, { color: '#eab308' }]}>Grasas</Text>
                    <Text variant="bodySmall" style={styles.macroStat}>{Math.round(dailyMacros.fat)}g/{targets.fat}g</Text>
                  </View>
                  <ProgressBar 
                    progress={Math.min(dailyMacros.fat / targets.fat, 1)} 
                    color="#eab308" 
                    style={styles.macroBar} 
                  />
                </View>
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

          <View style={styles.historySection}>
            <Text variant="titleMedium" style={styles.historyTitle}>Historial de Ingestas Recientes</Text>
          </View>
        </>
      }
      ListEmptyComponent={
        loading ? (
          <Text style={styles.emptyText}>Cargando consumos...</Text>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="silverware-fork-knife" size={40} color="#64748b" />
            <Text style={styles.emptyText}>Aún no registras consumos hoy.</Text>
            <Text style={styles.emptySubText}>Escanear el QR o ingresa un consumo usando el botón superior.</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Card style={styles.logCard}>
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
      )}
      ListFooterComponent={
        loadingMore ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 12 }}>Cargando más consumos...</Text>
          </View>
        ) : null
      }
    />
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
  ringWrapper: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 16,
  },
  ringCenterText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 110,
  },
});
