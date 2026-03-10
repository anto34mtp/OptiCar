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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import api, { authService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { getAllLocalData, clearAllLocalData } from '../services/local';

const PART_TYPE_TO_CATEGORY: Record<string, string> = {
  VIDANGE: 'MOTEUR', FILTRE_AIR: 'MOTEUR', FILTRE_CARBURANT: 'MOTEUR',
  BOUGIES: 'MOTEUR', FILTRE_HABITACLE: 'MOTEUR', LIQUIDE_REFROIDISSEMENT: 'MOTEUR',
  KIT_DISTRIBUTION: 'DISTRIBUTION', POMPE_EAU: 'DISTRIBUTION', COURROIE_ACCESSOIRES: 'DISTRIBUTION',
  PLAQUETTES_AV: 'FREINAGE', PLAQUETTES_AR: 'FREINAGE', DISQUES_AV: 'FREINAGE',
  DISQUES_AR: 'FREINAGE', LIQUIDE_FREIN: 'FREINAGE',
  PNEUS_AV: 'LIAISON_SOL', PNEUS_AR: 'LIAISON_SOL',
  BATTERIE: 'ADMINISTRATIF', CONTROLE_TECHNIQUE: 'ADMINISTRATIF',
};

async function migrateLocalToServer(
  localData: Awaited<ReturnType<typeof getAllLocalData>>,
  accessToken: string,
  refreshToken: string,
): Promise<{ success: number; errors: string[] }> {
  // Store both tokens so the api interceptor can work properly during migration
  await SecureStore.setItemAsync('accessToken', accessToken);
  await SecureStore.setItemAsync('refreshToken', refreshToken);

  const { vehicles, refuels, rules, records, insurance } = localData;
  const idMap: Record<string, string> = {};
  let success = 0;
  const errors: string[] = [];

  // 1. Vehicles
  for (const v of vehicles) {
    try {
      const res = await api.post('/vehicles', {
        brand: v.brand,
        model: v.model,
        fuelType: v.fuelType,
        ...(v.year ? { year: v.year } : {}),
        ...(v.co2PerKm ? { co2PerKm: v.co2PerKm } : {}),
      });
      idMap[v.id] = res.data.id;
      success++;
    } catch (e: any) {
      errors.push(`Véhicule "${v.brand} ${v.model}": ${e.response?.data?.message || e.message}`);
    }
  }

  // 2. Refuels — only send fields accepted by the DTO
  for (const r of refuels) {
    const newVehicleId = idMap[r.vehicleId];
    if (!newVehicleId) continue;
    try {
      await api.post(`/vehicles/${newVehicleId}/refuels`, {
        mileage: r.mileage,
        pricePerLiter: r.pricePerLiter,
        liters: r.liters,
        totalPrice: r.totalPrice,
        sourceType: r.sourceType || 'MANUAL',
        ...(r.date ? { date: r.date } : {}),
      });
      success++;
    } catch (e: any) {
      errors.push(`Plein: ${e.response?.data?.message || e.message}`);
    }
  }

  // 3. Maintenance rules — server requires category, forbids lastServiceKm/lastServiceDate
  for (const rule of rules) {
    const newVehicleId = idMap[rule.vehicleId];
    if (!newVehicleId) continue;
    try {
      const category = rule.category || PART_TYPE_TO_CATEGORY[rule.partType] || 'MOTEUR';
      await api.post(`/vehicles/${newVehicleId}/maintenance/rules`, {
        partType: rule.partType,
        category,
        ...(rule.intervalKm ? { intervalKm: rule.intervalKm } : {}),
        ...(rule.intervalMonths ? { intervalMonths: rule.intervalMonths } : {}),
      });
      success++;
    } catch (e: any) {
      errors.push(`Règle "${rule.partType}": ${e.response?.data?.message || e.message}`);
    }
  }

  // 4. Maintenance records — server requires sourceType, forbids unknown fields
  for (const rec of records) {
    const newVehicleId = idMap[rec.vehicleId];
    if (!newVehicleId) continue;
    try {
      await api.post(`/vehicles/${newVehicleId}/maintenance/records`, {
        partType: rec.partType,
        date: rec.date,
        mileage: rec.mileage,
        sourceType: rec.sourceType || 'MANUAL',
        ...(rec.price ? { price: rec.price } : {}),
        ...(rec.garage ? { garage: rec.garage } : {}),
        ...(rec.notes ? { notes: rec.notes } : {}),
      });
      success++;
    } catch (e: any) {
      errors.push(`Entretien "${rec.partType}": ${e.response?.data?.message || e.message}`);
    }
  }

  // 5. Insurance
  for (const ins of insurance) {
    const newVehicleId = idMap[ins.vehicleId];
    if (!newVehicleId) continue;
    try {
      await api.post(`/vehicles/${newVehicleId}/insurance`, {
        date: ins.date,
        amount: ins.amount,
        type: ins.type,
        ...(ins.insurer ? { insurer: ins.insurer } : {}),
        ...(ins.notes ? { notes: ins.notes } : {}),
      });
      success++;
    } catch (e: any) {
      errors.push(`Assurance: ${e.response?.data?.message || e.message}`);
    }
  }

  return { success, errors };
}

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { setAuth, isLocalMode } = useAuthStore();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [migrating, setMigrating] = useState(false);

  const registerMutation = useMutation({
    mutationFn: () => authService.register(email, password, name || undefined),
    onSuccess: async (data) => {
      // 1. Bascule en mode cloud EN PREMIER — stocke les tokens proprement dans SecureStore
      await setAuth(data.user, data.accessToken, data.refreshToken);

      if (isLocalMode) {
        // 2. Récupère les données locales (setAuth ne les efface pas)
        const localData = await getAllLocalData();
        const total = localData.vehicles.length + localData.refuels.length +
          localData.rules.length + localData.records.length + localData.insurance.length;

        if (total > 0) {
          setMigrating(true);
          try {
            const { success, errors } = await migrateLocalToServer(
              localData,
              data.accessToken,
              data.refreshToken,
            );

            // 3. Efface les données locales seulement si au moins un élément a migré
            if (success > 0) {
              await clearAllLocalData();
            }

            if (errors.length > 0) {
              Alert.alert(
                'Migration partielle',
                `${success} éléments migrés.\n${errors.length} erreur(s) :\n${errors.slice(0, 3).join('\n')}`,
              );
            }
          } catch (e: any) {
            Alert.alert('Erreur de migration', e.message || 'Migration échouée, données locales conservées.');
          } finally {
            setMigrating(false);
          }
        } else {
          await clearAllLocalData();
        }
      }

      // 4. Vide le cache React Query pour recharger depuis le cloud
      queryClient.clear();
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
            maxLength={15}
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
