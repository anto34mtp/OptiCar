import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { clearAllLocalData } from '../services/local';
import { shadow } from '../theme';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: async (data) => {
      await clearAllLocalData();
      await setAuth(data.user, data.accessToken, data.refreshToken);
    },
    onError: () => {
      Alert.alert('Erreur', 'Email ou mot de passe incorrect');
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />

      {/* Top brand zone */}
      <View style={styles.topZone}>
        <View style={styles.logoBox}>
          <Text style={styles.logoEmoji}>🚗</Text>
        </View>
        <Text style={styles.appName}>OptiCar</Text>
        <Text style={styles.tagline}>Connexion à votre espace</Text>
      </View>

      {/* Form card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Se connecter</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Adresse email"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textLight} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Mot de passe"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textLight}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.loginBtn, loginMutation.isPending && { opacity: 0.7 }]}
          onPress={() => loginMutation.mutate()}
          disabled={loginMutation.isPending}
          activeOpacity={0.85}
        >
          {loginMutation.isPending
            ? <Text style={styles.loginBtnText}>Connexion...</Text>
            : <>
                <Text style={styles.loginBtnText}>Se connecter</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotRow}>
          <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom link */}
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.bottomLink}>
        <Text style={styles.bottomLinkText}>
          Pas encore de compte ?{'  '}
          <Text style={styles.bottomLinkBold}>Créer un compte</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.dark,
  },

  topZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 8,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: c.darkMid,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  card: {
    backgroundColor: c.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    marginBottom: 24,
  },

  inputGroup: {
    gap: 12,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: c.text,
  },
  eyeBtn: {
    padding: 4,
  },

  loginBtn: {
    backgroundColor: c.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadow.md,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  forgotRow: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  forgotText: {
    color: c.textMid,
    fontSize: 14,
  },

  bottomLink: {
    backgroundColor: c.dark,
    alignItems: 'center',
    paddingVertical: 20,
  },
  bottomLinkText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  bottomLinkBold: {
    color: c.primary,
    fontWeight: '700',
  },
});
