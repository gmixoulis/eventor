import { Tabs } from 'expo-router';

import { tabsForMode } from '@/components/tabs';
import { useSession } from '@/store';

// The visible bar is the root layout's TabBar, which stays on pushed screens too; this navigator draws none.
const noTabBar = () => null;

export default function TabsLayout() {
  const { isGuest } = useSession();

  return (
    <Tabs tabBar={noTabBar} screenOptions={{ headerShown: false }}>
      {/* Tab screens must all stay registered even when a feature is off: the custom TabBar hides tabs and the root FeatureGate shows Not available; do not pass flags here. */}
      {tabsForMode(isGuest).map((tab) => {
        const href = tab.hidden ? null : tab.target ?? undefined;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{ title: tab.title, ...(href === undefined ? {} : { href }) }}
          />
        );
      })}
    </Tabs>
  );
}
