import { Text, Pressable, StyleSheet, TextInput } from "react-native";
export const listStyles = StyleSheet.create({
  card: {
    gap: 14,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#211b2d",
    borderWidth: 1,
    borderColor: "#3c304e",
  },
  title: { fontSize: 20, fontWeight: "700", color: "#eee8f8" },
  text: { fontSize: 14, color: "#eee8f8" },
  muted: { fontSize: 12, lineHeight: 20, color: "#b1a5bf" },
  input: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#2b2237",
    color: "white",
    borderWidth: 1,
    borderColor: "#4c3e5e",
  },
  button: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: "#443057",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
});
export function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[listStyles.button, disabled && { opacity: 0.4 }]}
    >
      <Text style={listStyles.text}>{title}</Text>
    </Pressable>
  );
}
export function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <TextInput
      accessibilityLabel={label}
      placeholder={label}
      placeholderTextColor="#9c8eae"
      value={value}
      onChangeText={onChange}
      style={listStyles.input}
      autoCapitalize="none"
    />
  );
}
