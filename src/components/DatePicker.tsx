import { useState } from "react";
import { View, Text, Pressable } from "react-native";
export function DatePicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (date: Date) => void;
}) {
  const [month, setMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1),
  );
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const offset = (month.getDay() + 6) % 7;
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityLabel="Önceki ay"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
          }
        >
          <Text style={{ color: "#bcb2ff", fontSize: 26 }}>‹</Text>
        </Pressable>
        <Text style={{ color: "white" }}>
          {month.toLocaleDateString("tr-TR", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <Pressable
          accessibilityLabel="Sonraki ay"
          onPress={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          <Text style={{ color: "#bcb2ff", fontSize: 26 }}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((d) => (
          <Text
            key={d}
            style={{
              width: "14.28%",
              textAlign: "center",
              color: "#88889c",
              padding: 8,
            }}
          >
            {d}
          </Text>
        ))}
        {Array.from({ length: count + offset }, (_, i) => {
          const day = i - offset + 1;
          const date = new Date(month.getFullYear(), month.getMonth(), day);
          const future = date > new Date();
          return (
            <Pressable
              key={i}
              disabled={day < 1 || future}
              onPress={() => {
                const selected = new Date(date);
                selected.setHours(
                  value.getHours(),
                  value.getMinutes(),
                  value.getSeconds(),
                  value.getMilliseconds(),
                );
                onChange(selected);
              }}
              style={{
                width: "14.28%",
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
                backgroundColor:
                  day > 0 && date.toDateString() === value.toDateString()
                    ? "#7963dd"
                    : "transparent",
              }}
            >
              <Text style={{ color: future ? "#49495c" : "white" }}>
                {day > 0 ? day : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
