import { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';

// Screens
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import AddRefuelScreen from '../screens/AddRefuelScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import VehicleMaintenanceScreen from '../screens/VehicleMaintenanceScreen';
import AddMaintenanceScreen from '../screens/AddMaintenanceScreen';
import MaintenanceRulesScreen from '../screens/MaintenanceRulesScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: '🏠',
    Vehicles: '🚗',
    Maintenance: '🔧',
    Stats: '📊',
  };
  return (
    <Text style={{ fontSize: focused ? 24 : 20 }}>{icons[name]}</Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen
        name="Vehicles"
        component={VehiclesScreen}
        options={{ title: 'Véhicules' }}
      />
      <Tab.Screen
        name="Maintenance"
        component={MaintenanceScreen}
        options={{ title: 'Entretien' }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: 'Statistiques' }}
      />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isLocalMode, hasChosenMode, loadAuth } = useAuthStore();
  const { loadSettings } = useNotificationSettingsStore();

  useEffect(() => {
    loadAuth();
    loadSettings();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated || isLocalMode ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={{ headerShown: true, title: 'Détails' }}
          />
          <Stack.Screen
            name="AddRefuel"
            component={AddRefuelScreen}
            options={{ headerShown: true, title: 'Ajouter un plein' }}
          />
          <Stack.Screen
            name="VehicleMaintenance"
            component={VehicleMaintenanceScreen}
            options={{ headerShown: true, title: 'Entretien véhicule' }}
          />
          <Stack.Screen
            name="AddMaintenance"
            component={AddMaintenanceScreen}
            options={{ headerShown: true, title: 'Ajouter un entretien' }}
          />
          <Stack.Screen
            name="MaintenanceRules"
            component={MaintenanceRulesScreen}
            options={{ headerShown: true, title: "Règles d'entretien" }}
          />
          <Stack.Screen
            name="Insurance"
            component={InsuranceScreen}
            options={{ headerShown: true, title: 'Assurance' }}
          />
          {isLocalMode && (
            <>
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
            </>
          )}
        </>
      ) : !hasChosenMode ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: true, title: 'Mot de passe oublié' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: true, title: 'Mot de passe oublié' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
