import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../stores/themeStore';
import { THEME_META, shadow, type ThemeName } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ThemePicker({ visible, onClose }: Props) {
  const { themeName, setTheme, colors } = useThemeStore();

  const handleSelect = async (name: ThemeName) => {
    await setTheme(name);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]}>Choisir un thème</Text>
            <TouchableOpacity onPress={onClose} style={[styles.xBtn, { backgroundColor: colors.border }]}>
              <Ionicons name="close" size={16} color={colors.textMid} />
            </TouchableOpacity>
          </View>

          <View style={styles.grid}>
            {THEME_META.map((meta) => {
              const active = themeName === meta.name;
              return (
                <TouchableOpacity
                  key={meta.name}
                  style={[
                    styles.themeCard,
                    {
                      backgroundColor: meta.preview.bg,
                      borderColor: active ? colors.primary : 'transparent',
                      borderWidth: active ? 2 : 0,
                    },
                  ]}
                  onPress={() => handleSelect(meta.name)}
                  activeOpacity={0.8}
                >
                  {/* Mini UI preview */}
                  <View style={[styles.previewHeader, { backgroundColor: meta.preview.bg }]}>
                    <View style={[styles.previewDot, { backgroundColor: meta.preview.accent }]} />
                    <View style={[styles.previewLine, { backgroundColor: meta.preview.accent, opacity: 0.4 }]} />
                  </View>
                  <View style={[styles.previewCard, { backgroundColor: meta.preview.card }]}>
                    <View style={[styles.previewBar, { backgroundColor: meta.preview.accent }]} />
                    <View style={[styles.previewBarSm, { backgroundColor: meta.preview.accent, opacity: 0.4 }]} />
                  </View>
                  <View style={[styles.previewTab, { backgroundColor: meta.preview.bg }]}>
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.previewTabDot,
                          { backgroundColor: i === 1 ? meta.preview.accent : meta.preview.accent, opacity: i === 1 ? 1 : 0.3 },
                        ]}
                      />
                    ))}
                  </View>

                  {/* Active check */}
                  {active && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}

                  {/* Label */}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaEmoji}>{meta.emoji}</Text>
                    <Text style={[styles.metaLabel, { color: meta.preview.accent }]}>
                      {meta.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeBtnText, { color: colors.textMid }]}>Fermer</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 32,
    ...shadow.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  xBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  themeCard: {
    width: 100,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    ...shadow.md,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  previewLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  previewCard: {
    marginHorizontal: 6,
    borderRadius: 6,
    padding: 6,
    flex: 1,
    gap: 4,
  },
  previewBar: {
    height: 5,
    borderRadius: 3,
    width: '70%',
  },
  previewBarSm: {
    height: 4,
    borderRadius: 2,
    width: '45%',
  },
  previewTab: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 5,
  },
  previewTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  metaEmoji: {
    fontSize: 10,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
