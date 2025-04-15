import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Restaurant POS',
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="tabs" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
