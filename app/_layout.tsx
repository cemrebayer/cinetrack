import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { WelcomeGate } from "../src/components/Welcome";
export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <WelcomeGate>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#101017" },
          }}
        />
      </WelcomeGate>
    </>
  );
}
