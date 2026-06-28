import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ScrollView, Pressable, Alert } from 'react-native';
import { Text, Button, Card, ActivityIndicator, Searchbar } from 'react-native-paper';
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
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/ingredients', {
        params: { page: 0, size: 100, sort: 'name,asc' }
      });
      const content = response.data.content || [];
      setIngredients(content);
    } catch (err: any) {
      console.error('Error fetching ingredients', err);
      Alert.alert('Error', 'No se pudo cargar el catálogo de ingredientes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleToggleAllergen = async (ingredient: Ingredient) => {
    const isAlreadyAllergen = sessionAllergens.some((a) => a.id === ingredient.id);

    if (isAlreadyAllergen) {
      try {
        setSavingId(ingredient.id);
        await api.delete(`/users/allergens/${ingredient.id}`);
        
        const updated = sessionAllergens.filter((a) => a.id !== ingredient.id);
        await setSessionAllergens(updated);
      } catch (err: any) {
        console.error(err);
        const errorMsg = err.response?.data?.message || 'Error al eliminar el alérgeno.';
        Alert.alert('Error', errorMsg);
      } finally {
        setSavingId(null);
      }
      return;
    }

    try {
      setSavingId(ingredient.id);
      await api.post('/users/allergens', { ingredientId: ingredient.id });
      
      const updated = [...sessionAllergens, ingredient];
      await setSessionAllergens(updated);
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
  };

  const filteredIngredients = ingredients.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {/* Sección de Alérgenos Activos */}
      <View style={{ marginBottom: 24 }}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Mis Alérgenos Registrados ({sessionAllergens.length})
        </Text>
        {sessionAllergens.length === 0 ? (
          <Text style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
            No tienes alérgenos registrados en tu perfil.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {sessionAllergens.map((allergen: any) => (
              <View 
                key={allergen.id} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: 'rgba(244, 63, 94, 0.1)', 
                  borderColor: 'rgba(244, 63, 94, 0.2)', 
                  borderWidth: 1, 
                  paddingLeft: 10, 
                  paddingRight: 6, 
                  paddingVertical: 5, 
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#f43f5e', fontSize: 11, fontWeight: 'bold', marginRight: 4 }}>
                  {allergen.name}
                </Text>
                <Pressable onPress={() => handleToggleAllergen(allergen)}>
                  <MaterialCommunityIcons name="close-circle" size={14} color="#f43f5e" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Sección del Catálogo con Buscador */}
      <View style={{ marginBottom: 12 }}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Catálogo de Ingredientes ({filteredIngredients.length})
        </Text>
        <Searchbar
          placeholder="Buscar ingrediente..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          placeholderTextColor="#64748b"
          iconColor="#10b981"
          inputStyle={{ color: '#fff', fontSize: 14 }}
        />
      </View>

      {/* Grid de Chips de Ingredientes */}
      {loading ? (
        <ActivityIndicator size="small" color="#10b981" style={{ padding: 20 }} />
      ) : filteredIngredients.length === 0 ? (
        <Text style={styles.emptyText}>No se encontraron ingredientes.</Text>
      ) : (
        <View style={styles.chipsContainer}>
          {filteredIngredients.map((item) => {
            const isSelected = sessionAllergens.some((a) => a.id === item.id);
            const isSaving = savingId === item.id;

            return (
              <Pressable 
                key={item.id}
                onPress={() => !isSaving && handleToggleAllergen(item)}
                style={[
                  styles.allergenChip,
                  isSelected ? styles.allergenChipSelected : styles.allergenChipUnselected
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 4 }} />
                ) : isSelected ? (
                  <MaterialCommunityIcons name="alert-circle" size={14} color="#f43f5e" style={{ marginRight: 4 }} />
                ) : (
                  <MaterialCommunityIcons name="circle-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                )}
                <Text style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : styles.chipTextUnselected
                ]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Botón de Logout */}
      <View style={{ marginTop: 30 }}>
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
  searchbar: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  allergenChipSelected: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderColor: 'rgba(244, 63, 94, 0.3)',
  },
  allergenChipUnselected: {
    backgroundColor: '#0f172a',
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#f43f5e',
  },
  chipTextUnselected: {
    color: '#94a3b8',
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
