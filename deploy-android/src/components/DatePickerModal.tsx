import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD
  onConfirm: (date: string) => void;
  onCancel: () => void;
}

export default function DatePickerModal({ visible, value, onConfirm, onCancel }: Props) {
  const parsed = value ? new Date(value + 'T12:00:00') : new Date();
  const [year, setYear] = useState(parsed.getFullYear());
  const [month, setMonth] = useState(parsed.getMonth() + 1);
  const [day, setDay] = useState(parsed.getDate());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const handleMonthChange = (m: number) => {
    setMonth(m);
    const max = daysInMonth(m, year);
    if (day > max) setDay(max);
  };

  const handleConfirm = () => {
    const d = String(Math.min(day, maxDay)).padStart(2, '0');
    const m = String(month).padStart(2, '0');
    onConfirm(`${year}-${m}-${d}`);
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={styles.cancel}>Annuler</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📅 Choisir une date</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={styles.confirm}>OK</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.pickers}>
            <Picker style={styles.pickerDay} selectedValue={day} onValueChange={setDay}>
              {days.map((d) => (
                <Picker.Item key={d} label={String(d)} value={d} />
              ))}
            </Picker>
            <Picker style={styles.pickerMonth} selectedValue={month} onValueChange={handleMonthChange}>
              {MONTHS.map((name, i) => (
                <Picker.Item key={i} label={name} value={i + 1} />
              ))}
            </Picker>
            <Picker style={styles.pickerYear} selectedValue={year} onValueChange={setYear}>
              {years.map((y) => (
                <Picker.Item key={y} label={String(y)} value={y} />
              ))}
            </Picker>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cancel: { fontSize: 15, color: '#6b7280', paddingHorizontal: 4 },
  confirm: { fontSize: 15, fontWeight: '700', color: '#3b82f6', paddingHorizontal: 4 },
  pickers: { flexDirection: 'row' },
  pickerDay: { flex: 0.7 },
  pickerMonth: { flex: 1.6 },
  pickerYear: { flex: 1 },
});
