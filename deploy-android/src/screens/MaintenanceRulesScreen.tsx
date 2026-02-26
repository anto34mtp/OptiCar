import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { maintenanceService } from '../services/api';

const PART_TYPE_LABELS: Record<string, string> = {
  VIDANGE: 'Vidange',
  FILTRE_AIR: 'Filtre à air',
  FILTRE_CARBURANT: 'Filtre carburant',
  BOUGIES: 'Bougies',
  FILTRE_HABITACLE: 'Filtre habitacle',
  KIT_DISTRIBUTION: 'Kit distribution',
  POMPE_EAU: 'Pompe à eau',
  COURROIE_ACCESSOIRES: 'Courroie accessoires',
  LIQUIDE_REFROIDISSEMENT: 'Liquide refroidissement',
  PLAQUETTES_AV: 'Plaquettes avant',
  PLAQUETTES_AR: 'Plaquettes arrière',
  DISQUES_AV: 'Disques avant',
  DISQUES_AR: 'Disques arrière',
  LIQUIDE_FREIN: 'Liquide de frein',
  PNEUS_AV: 'Pneus avant',
  PNEUS_AR: 'Pneus arrière',
  BATTERIE: 'Batterie',
  CONTROLE_TECHNIQUE: 'Contrôle technique',
};

export default function MaintenanceRulesScreen({ route }: any) {
  const { vehicleId } = route.params;
  const queryClient = useQueryClient();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKm, setEditKm] = useState('');
  const [editMonths, setEditMonths] = useState('');

  const { data: rules, isLoading } = useQuery({
    queryKey: ['maintenance-rules', vehicleId],
    queryFn: () => maintenanceService.getRules(vehicleId),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['maintenance-rules', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-status', vehicleId] });
    queryClient.invalidateQueries({ queryKey: ['maintenance-predictions', vehicleId] });
  };

  const initMutation = useMutation({
    mutationFn: () => maintenanceService.initDefaults(vehicleId),
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => maintenanceService.updateRule(id, data),
    onSuccess: () => {
      invalidateAll();
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => maintenanceService.deleteRule(id),
    onSuccess: invalidateAll,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {(!rules || rules.length === 0) && (
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={() => initMutation.mutate()}
          disabled={initMutation.isPending}
        >
          <Text style={styles.btnPrimaryText}>
            {initMutation.isPending ? 'Initialisation...' : 'Initialiser par défaut'}
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={rules || []}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ruleCard}>
            <Text style={styles.ruleName}>{PART_TYPE_LABELS[item.partType] || item.partType}</Text>

            {editingId === item.id ? (
              <View>
                <View style={styles.editRow}>
                  <Text style={styles.editLabel}>Km:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editKm}
                    onChangeText={setEditKm}
                    keyboardType="numeric"
                    placeholder="km"
                  />
                  <Text style={styles.editLabel}>Mois:</Text>
                  <TextInput
                    style={styles.editInput}
                    value={editMonths}
                    onChangeText={setEditMonths}
                    keyboardType="numeric"
                    placeholder="mois"
                  />
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity
                    onPress={() =>
                      updateMutation.mutate({
                        id: item.id,
                        data: {
                          intervalKm: editKm ? parseInt(editKm) : null,
                          intervalMonths: editMonths ? parseInt(editMonths) : null,
                        },
                      })
                    }
                  >
                    <Text style={{ color: '#22c55e', fontWeight: '600' }}>Sauver</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)}>
                    <Text style={{ color: '#6b7280' }}>Annuler</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.ruleInfo}>
                  {item.intervalKm ? `${item.intervalKm.toLocaleString()} km` : '—'}
                  {' · '}
                  {item.intervalMonths ? `${item.intervalMonths} mois` : '—'}
                </Text>
                <View style={styles.ruleActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(item.id);
                      setEditKm(item.intervalKm?.toString() || '');
                      setEditMonths(item.intervalMonths?.toString() || '');
                    }}
                  >
                    <Text style={{ color: '#3b82f6', fontSize: 13 }}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Supprimer', 'Supprimer cette règle ?', [
                        { text: 'Annuler' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ])
                    }
                  >
                    <Text style={{ color: '#ef4444', fontSize: 13 }}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Aucune règle</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btnPrimary: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  ruleCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  ruleName: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginBottom: 4 },
  ruleInfo: { fontSize: 13, color: '#6b7280' },
  ruleActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  editLabel: { fontSize: 13, color: '#6b7280' },
  editInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 70, fontSize: 13 },
  editActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40 },
});
