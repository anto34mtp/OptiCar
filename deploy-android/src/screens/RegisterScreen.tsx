import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import api, { authService, vehiclesService, refuelsService, maintenanceService, insuranceService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getAllLocalData, clearAllLocalData } from '../services/local';

async function migrateLocalToServer(localData: Awaited<ReturnType<typeof getAllLocalData>>) {
  const { vehicles, refuels, rules, records, insurance } = localData;
  const idMap: Record<string, string> = {};

  for (const v of vehicles) {
    try {
      const created = await vehiclesService.create({
        brand: v.brand, model: v.model, fuelType: v.fuelType,
        year: v.year, co2PerKm: v.co2PerKm,
      });
      idMap[v.id] = created.id;
    } catch { /* ignore */ }
  }

  for (const r of refuels) {
    const newVehicleId = idMap[r.vehicleId];
    if (!newVehicleId) continue;
    try {
      await refuelsService.create(newVehicleId, {
        mileage: r.mileage, pricePerLiter: r.pricePerLiter,
        liters: r.liters, totalPrice: r.totalPrice, sourceType: r.sourceType || 'MANUAL',
      });
    } catch { /* ignore */ }
  }

  for (const rule of rules) {
    const newVehicleId = idMap[rule.vehicleId];
    if (!newVehicleId) continue;
    try {
      await api.post(`/vehicles/${newVehicleId}/maintenance/rules`, {
        partType: rule.partType, intervalKm: rule.intervalKm,
        intervalMonths: rule.intervalMonths,
        lastServiceKm: rule.lastServiceKm, lastServiceDate: rule.lastServiceDate,
      });
    } catch { /* ignore */ }
  }

  for (const rec of records) {
    const newVehicleId = idMap[rec.vehicleId];
    if (!newVehicleId) continue;
    try {
      await maintenanceService.createRecord(newVehicleId, {
        partType: rec.partType, date: rec.date, mileage: rec.mileage,
        price: rec.price, garage: rec.garage, notes: rec.notes,
      });
    } catch { /* ignore */ }
  }

  for (const ins of insurance) {
    const newVehicleId = idMap[ins.vehicleId];
    if (!newVehicleId) continue;
    try {
      await insuranceService.create(newVehicleId, {
        date: ins.date, amount: ins.amount, type: ins.type,
        insurer: ins.insurer, notes: ins.notes,
      });
    } catch { /* ignore */ }
  }
}

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setAuth, isLocalMode, setLocalMode, clearLocalMode } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [migrating, setMigrating] = useState(false);

  const registerMutation = useMutation({
    mutationFn: () => authService.register(email, password, name || undefined),
    onSuccess: async (data) => {
      await setAuth(data.user, data.accessToken, data.refreshToken);

      if (isLocalMode) {
        setMigrating(true);
        try {
          const localData = await getAllLocalData();
          const hasData = localData.vehicles.length > 0;
          if (hasData) {
            await migrateLocalToServer(localData);
          }
          await clearAllLocalData();
          await setLocalMode(false);
        } catch { /* migration failure non-bloquante */ } finally {
          setMigrating(false);
        }
      }
    },
    onError: (error: any) => {
      Alert.alert('Erreur', error.response?.data?.message || 'Erreur lors de la création du compte');
    },
  });

  const handleRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Créer un compte</Text>
        <Text style={styles.subtitle}>Commencez à suivre vos dépenses</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nom (optionnel)"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirmer le mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={registerMutation.isPending || migrating}
          >
            {migrating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.buttonText}>Migration des données...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>
                {registerMutation.isPending ? 'Création...' : 'Créer mon compte'}
              </Text>
            )}
          </TouchableOpacity>

          {isLocalMode && (
            <Text style={styles.migrationNote}>
              Vos données locales seront automatiquement synchronisées.
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>
            Déjà un compte ? <Text style={styles.linkBold}>Se connecter</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 24,
    color: '#6b7280',
  },
  linkBold: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  migrationNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
});
