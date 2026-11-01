import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";
import { useAvatar, useLibrary } from "../store";
import { progression } from "../lib/domain";
import { items } from "../lib/catalog";
export function Avatar() {
  const { equippedItems, body } = useAvatar();
  const level = progression(useLibrary((s) => s.logs)).level;
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withSequence(withSpring(1.1), withSpring(1));
  }, [level]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const unlocked = progression(useLibrary((s) => s.logs)).unlockedItemIds;
  const asset = (category: keyof typeof equippedItems) =>
    items.find(
      (i) => i.id === equippedItems[category] && unlocked.includes(i.id),
    )?.assetSource;
  return (
    <Animated.View
      style={[
        styles.stage,
        animated,
        { backgroundColor: asset("background") ?? "#242448" },
      ]}
    >
      <Text style={styles.stars}>✦ · ✧ · ✦</Text>
      <View
        style={[
          styles.body,
          { backgroundColor: body === "warm" ? "#eabc99" : "#9b6650" },
        ]}
      />
      <View
        style={[
          styles.outfit,
          { backgroundColor: asset("outfit") ?? "#9ca4ba" },
        ]}
      />
      <View
        style={[
          styles.face,
          { backgroundColor: body === "warm" ? "#f3caa7" : "#ac785f" },
        ]}
      >
        <Text style={styles.eyes}>● ●</Text>
        <Text style={styles.mouth}>⌣</Text>
      </View>
      <Text style={styles.hat}>{asset("hat") ?? "〰"}</Text>
      <Text style={styles.accessory}>{asset("accessory")}</Text>
      <View style={styles.platform} />
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  stage: { height: 230, borderRadius: 28, overflow: "hidden", width: "100%" },
  stars: {
    position: "absolute",
    top: 24,
    alignSelf: "center",
    fontSize: 25,
    color: "#b7adff",
  },
  body: {
    position: "absolute",
    width: 90,
    height: 115,
    borderRadius: 35,
    top: 100,
    alignSelf: "center",
  },
  outfit: {
    position: "absolute",
    width: 116,
    height: 84,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    top: 126,
    alignSelf: "center",
  },
  face: {
    position: "absolute",
    width: 86,
    height: 86,
    borderRadius: 35,
    top: 57,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  eyes: { fontSize: 17, color: "#25213a" },
  mouth: { fontSize: 29, lineHeight: 25, color: "#25213a" },
  hat: {
    position: "absolute",
    top: 28,
    alignSelf: "center",
    fontSize: 54,
    color: "#322b42",
  },
  accessory: { position: "absolute", top: 148, left: "56%", fontSize: 32 },
  platform: {
    position: "absolute",
    bottom: 12,
    width: 150,
    height: 9,
    borderRadius: 10,
    backgroundColor: "#ffffff15",
    alignSelf: "center",
  },
});
