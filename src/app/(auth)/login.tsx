import React, { useState } from 'react'; // Re-evaluating imports
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { Link } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { login } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Por favor, ingresa tu usuario y contraseña.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const cleanUsername = username.trim().toLowerCase();
      const response = await api.post('/auth/login', { username: cleanUsername, password: password.trim() });
      const { accessToken, refreshToken } = response.data;
      
      await login(cleanUsername, accessToken, refreshToken);
      
      // La navegación automática de _layout nos mandará a (tabs)
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Credenciales inválidas o error de conexión.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="dumbbell" size={64} color="#10b981" style={styles.logo} />
          <Text variant="headlineMedium" style={styles.title}>NutriTrack</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Trazabilidad Alimentaria & Fitness</Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <MaterialCommunityIcons name="alert-circle" size={20} color="#f43f5e" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            label="Usuario"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            autoCapitalize="none"
            textColor="#fff"
          />

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? 'eye-off' : 'eye'} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            textColor="#fff"
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Iniciar Sesión
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes una cuenta? </Text>
            <Link href="/(auth)/register" asChild>
              <Text style={styles.linkText}>Regístrate aquí</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020817',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    marginBottom: 12,
  },
  title: {
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 4,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#0f172a',
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 14,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#94a3b8',
  },
  linkText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
});
