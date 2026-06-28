import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable, Alert } from 'react-native';
import { Text, Button, Card, Switch, ActivityIndicator } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Ingredient {
  id: number;
  name: string;
  description: string;
  shelfLifeDays: number;
}

export default function ProfileScreen() {
  const { user, logout, sessionAllergens, setSessionAllergens } = useAuthStore();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchIngredients = useCallback(async (resetPage = false) => {
    const targetPage = resetPage ? 0 : page;
    if (resetPage) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const response = await api.get('/ingredients', {
        params: { page: targetPage, size: 15, sort: 'name,asc' }
      });
      const content = response.data.content || [];
      const isLast = response.data.last;

      if (resetPage) {
        setIngredients(content);
        setPage(1);
      } else {
        setIngredients(prev => [...prev, ...content]);
        setPage(targetPage + 1);
      }
      setHasMore(!isLast);
    } catch (err: any) {
      console.error('Error fetching ingredients', err);
      Alert.alert('Error', 'No se pudo cargar el catálogo de ingredientes.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIngredients(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchIngredients]);

  const handleToggleAllergen = async (ingredient: Ingredient) => {
    const isAlreadyAllergen = sessionAllergens.some((a) => a.id === ingredient.id);

    if (isAlreadyAllergen) {
      Alert.alert(
        'Limpiar Alérgenos',
        'El backend no cuenta con una API para desvincular alérgenos individuales. ¿Deseas limpiar todos tus alérgenos registrados localmente?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, Limpiar', 
            onPress: () => {
              setSessionAllergens([]);
              Alert.alert('Éxito', 'Se limpiaron tus alérgenos locales.');
            }
          }
        ]
      );
      return;
    }

    try {
      setSavingId(ingredient.id);
      await api.post('/users/allergens', { ingredientId: ingredient.id });
      
      const updated = [...sessionAllergens, ingredient];
      await setSessionAllergens(updated);
      
      Alert.alert('Éxito', `"${ingredient.name}" marcado como alérgeno.`);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.message || 'Error al guardar el alérgeno.';
      Alert.alert('Error', errorMsg);
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    // La navegación de _layout nos mandará a (auth)/login automáticamente
  };

  return (
    <FlatList
      data={ingredients}
      keyExtractor={(item) => item.id.toString()}
      style={styles.container}
      contentContainerStyle={styles.content}
      onEndReached={() => fetchIngredients(false)}
      onEndReachedThreshold={0.3}
      ListHeaderComponent={
        <>
          {/* Tarjeta de Datos del Usuario */}
          <Card style={styles.profileCard}>
            <Card.Content style={styles.profileContent}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="account-circle" size={80} color="#10b981" />
              </View>
              <View style={styles.userInfo}>
                <Text variant="headlineSmall" style={styles.username}>{user?.username}</Text>
                <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
                <View style={styles.rolesRow}>
                  {user?.roles.map((role, idx) => (
                    <View key={idx} style={styles.roleBadge}>
                      <Text style={styles.roleText}>{role.replace('ROLE_', '')}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Sección de Alérgenos */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Catálogo de Alérgenos ({sessionAllergens.length} registrados)
          </Text>
        </>
      }
      ListEmptyComponent={
        loading && ingredients.length === 0 ? (
          <ActivityIndicator size="small" color="#10b981" style={{ padding: 20 }} />
        ) : (
          <Text style={styles.emptyText}>No hay ingredientes en el catálogo.</Text>
        )
      }
      renderItem={({ item }) => {
        const isSelected = sessionAllergens.some((a) => a.id === item.id);
        const isSaving = savingId === item.id;

        return (
          <View style={styles.ingredientItemContainer}>
            <Pressable 
              onPress={() => !isSaving && handleToggleAllergen(item)}
              style={styles.ingredientRow}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text variant="bodyLarge" style={styles.ingredientName}>{item.name}</Text>
                {item.description ? (
                  <Text variant="bodySmall" style={styles.ingredientDesc}>{item.description}</Text>
                ) : null}
              </View>
              {isSaving ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Switch 
                  value={isSelected} 
                  onValueChange={() => handleToggleAllergen(item)}
                  color="#10b981"
                />
              )}
            </Pressable>
          </View>
        );
      }}
      ListFooterComponent={
        <View style={{ marginTop: 20 }}>
          {loadingMore && (
            <ActivityIndicator size="small" color="#10b981" style={{ marginBottom: 16 }} />
          )}
          {/* Botón de Logout */}
          <Button 
            mode="outlined" 
            onPress={handleLogout} 
            style={styles.logoutButton}
            textColor="#f43f5e"
            icon="logout"
          >
            Cerrar Sesión
          </Button>
        </View>
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
  profileCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 24,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontWeight: '900',
    color: '#fff',
  },
  email: {
    color: '#64748b',
    marginTop: 2,
  },
  rolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  ingredientItemContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  ingredientName: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ingredientDesc: {
    color: '#64748b',
    marginTop: 2,
    fontSize: 11,
  },
  divider: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 20,
  },
  logoutButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f43f5e',
    paddingVertical: 4,
  },
});
