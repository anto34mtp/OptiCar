import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Modal, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../stores/authStore';
import type { ThemeColors } from '../theme';
import { useThemeStore } from '../stores/themeStore';

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const { setLocalMode, setHasChosenMode, setLocalUserName } = useAuthStore();
  const { colors } = useThemeStore();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleLocalMode = async () => {
    setShowNameModal(true);
  };

  const confirmLocalMode = async () => {
    if (nameInput.trim()) {
      await setLocalUserName(nameInput.trim());
    }
    setShowNameModal(false);
    await setLocalMode(true);
  };

  const handleRegister = async () => {
    await setHasChosenMode(true);
    navigation.navigate('Register');
  };

  const handleLogin = async () => {
    await setHasChosenMode(true);
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Name prompt modal */}
      <Modal transparent animationType="fade" visible={showNameModal} onRequestClose={() => setShowNameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Votre prénom</Text>
            <Text style={styles.modalSubtitle}>Optionnel — pour personnaliser l'accueil</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Thomas"
              placeholderTextColor={colors.textLight}
              value={nameInput}
              onChangeText={setNameInput}
              maxLength={15}
              autoFocus
            />
            <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: -8 }}>
              {nameInput.length}/15
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={confirmLocalMode}>
              <Text style={styles.modalBtnText}>Continuer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmLocalMode}>
              <Text style={styles.modalSkip}>Passer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🚗</Text>
        <Text style={styles.appName}>OptiCar</Text>
        <Text style={styles.tagline}>Gérez vos véhicules, partout</Text>
      </View>

      {/* Fonctionnalités */}
      <View style={styles.features}>
        {[
          { icon: '⛽', text: 'Suivi des pleins et consommation' },
          { icon: '🔧', text: 'Entretien et alertes d\'usure' },
          { icon: '📊', text: 'Statistiques de coûts et CO2' },
          { icon: '🛡️', text: 'Gestion des assurances' },
        ].map((f) => (
          <View key={f.text} style={styles.featureRow}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
          <Text style={styles.primaryButtonText}>Créer un compte</Text>
        </TouchableOpacity>

        <View style={styles.syncNote}>
          <Text style={styles.syncNoteText}>
            ☁️  Synchronisez vos données sur plusieurs appareils
          </Text>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.localButton} onPress={handleLocalMode}>
          <Text style={styles.localButtonText}>Continuer sans compte</Text>
        </TouchableOpacity>

        <View style={styles.localNote}>
          <Text style={styles.localNoteText}>
            📱  Données stockées sur cet appareil uniquement
          </Text>
        </View>

        <TouchableOpacity style={styles.loginRow} onPress={handleLogin}>
          <Text style={styles.loginText}>
            Déjà un compte ?{' '}
            <Text style={styles.loginLink}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.headerBg,
  },
  header: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
  },
  features: {
    paddingHorizontal: 32,
    gap: 12,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  featureText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  actions: {
    backgroundColor: c.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: c.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  syncNote: {
    alignItems: 'center',
    marginTop: -4,
  },
  syncNoteText: {
    fontSize: 12,
    color: '#6b7280',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: c.border,
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  localButton: {
    borderWidth: 1.5,
    borderColor: c.border,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  localButtonText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
  },
  localNote: {
    alignItems: 'center',
    marginTop: -4,
  },
  localNoteText: {
    fontSize: 12,
    color: '#6b7280',
  },
  loginRow: {
    alignItems: 'center',
    marginTop: 4,
  },
  loginText: {
    color: c.text,
    fontSize: 14,
  },
  loginLink: {
    color: c.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: c.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: c.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: -4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginTop: 4,
    color: c.text,
    backgroundColor: c.inputBg,
  },
  modalBtn: {
    backgroundColor: c.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  modalSkip: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 13,
    paddingVertical: 4,
  },
});
