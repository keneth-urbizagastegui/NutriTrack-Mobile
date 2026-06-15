import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { api } from '../../services/api';
import { Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validaciones en tiempo real
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const getPasswordStrengthScore = () => {
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    return score;
  };

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (getPasswordStrengthScore() < 4) {
      setError('La contraseña debe cumplir con todos los requisitos de seguridad.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password: password
      });

      Alert.alert(
        'Registro Exitoso',
        'Tu usuario ha sido creado correctamente. Por favor inicia sesión.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || 'Error al registrar el usuario.';
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
          <MaterialCommunityIcons name="account-plus" size={56} color="#10b981" />
          <Text variant="headlineMedium" style={styles.title}>Crear Cuenta</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Únete a la red de trazabilidad NutriTrack</Text>
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
            label="Correo Electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
            autoCapitalize="none"
            keyboardType="email-address"
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

          {/* Validaciones visuales de contraseña */}
          {password.length > 0 && (
            <View style={styles.validationBox}>
              <Text style={styles.validationTitle}>Requisitos de Seguridad:</Text>
              <View style={styles.validationRow}>
                <MaterialCommunityIcons 
                  name={hasMinLength ? 'check-circle' : 'circle-outline'} 
                  size={16} 
                  color={hasMinLength ? '#10b981' : '#94a3b8'} 
                />
                <Text style={[styles.validationText, hasMinLength && styles.valid]}>Mínimo 8 caracteres</Text>
              </View>
              <View style={styles.validationRow}>
                <MaterialCommunityIcons 
                  name={hasUppercase ? 'check-circle' : 'circle-outline'} 
                  size={16} 
                  color={hasUppercase ? '#10b981' : '#94a3b8'} 
                />
                <Text style={[styles.validationText, hasUppercase && styles.valid]}>Una letra mayúscula</Text>
              </View>
              <View style={styles.validationRow}>
                <MaterialCommunityIcons 
                  name={hasNumber ? 'check-circle' : 'circle-outline'} 
                  size={16} 
                  color={hasNumber ? '#10b981' : '#94a3b8'} 
                />
                <Text style={[styles.validationText, hasNumber && styles.valid]}>Un número</Text>
              </View>
              <View style={styles.validationRow}>
                <MaterialCommunityIcons 
                  name={hasSpecial ? 'check-circle' : 'circle-outline'} 
                  size={16} 
                  color={hasSpecial ? '#10b981' : '#94a3b8'} 
                />
                <Text style={[styles.validationText, hasSpecial && styles.valid]}>Un carácter especial (ej. !@#$)</Text>
              </View>
            </View>
          )}

          <TextInput
            label="Confirmar Contraseña"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            style={styles.input}
            left={<TextInput.Icon icon="lock-check" />}
            textColor="#fff"
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Registrarse
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes una cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <Text style={styles.linkText}>Inicia Sesión</Text>
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
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: '900',
    color: '#fff',
    marginTop: 8,
  },
  subtitle: {
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#0f172a',
  },
  button: {
    marginTop: 16,
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
  validationBox: {
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  validationTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  validationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  validationText: {
    color: '#64748b',
    fontSize: 12,
  },
  valid: {
    color: '#10b981',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  footerText: {
    color: '#94a3b8',
  },
  linkText: {
    color: '#10b981',
    fontWeight: 'bold',
  },
});
