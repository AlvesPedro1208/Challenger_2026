import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { TabBarIcon } from '@/navigation';
import { colors } from '@/theme/tokens';

/**
 * The four screens the passenger can always reach, and the app's permanent way
 * out of any screen.
 *
 * The demo drives the router with `replace` on every phase change, so the stack
 * is regularly empty and the iOS edge-swipe has nothing to pop. Whatever the
 * journey does, the bar stays on screen — no state can become a dead end.
 *
 * Terminal and Chegada are contextual acts, opened by the journey or by a CTA
 * rather than chosen from the bar, so they live in this layout with `href: null`:
 * no tab of their own, same bar underneath them.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: styles.scene,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Viagem',
          tabBarIcon: ({ color }) => <TabBarIcon name="trip" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <TabBarIcon name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="ticket"
        options={{
          title: 'Bilhete',
          tabBarIcon: ({ color }) => <TabBarIcon name="ticket" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Pontualidade',
          tabBarIcon: ({ color }) => <TabBarIcon name="stats" color={color} />,
        }}
      />
      <Tabs.Screen name="terminal" options={{ title: 'Terminal', href: null }} />
      <Tabs.Screen name="arrival" options={{ title: 'Chegada', href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.bg.primary,
  },
  bar: {
    backgroundColor: colors.bg.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline.onDark,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
