import { useEffect } from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';
import { useNotificationSettingsStore } from '../stores/notificationSettingsStore';
import { useThemeStore } from '../stores/themeStore';

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

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Dashboard:   { active: 'home',        inactive: 'home-outline' },
  Vehicles:    { active: 'car',         inactive: 'car-outline' },
  Maintenance: { active: 'construct',   inactive: 'construct-outline' },
  Stats:       { active: 'stats-chart', inactive: 'stats-chart-outline' },
};

function MainTabs() {
  const { colors } = useThemeStore();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          return (
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={focused ? size + 1 : size}
              color={focused ? colors.tabBarActive : colors.tabBarInactive}
            />
          );
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: colors.tabBar === '#ffffff' ? 1 : 0,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={DashboardScreen}   options={{ title: 'Accueil' }} />
      <Tab.Screen name="Vehicles"    component={VehiclesScreen}    options={{ title: 'Véhicules' }} />
      <Tab.Screen name="Maintenance" component={MaintenanceScreen} options={{ title: 'Entretien' }} />
      <Tab.Screen name="Stats"       component={StatsScreen}       options={{ title: 'Statistiques' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, isLoading, isLocalMode, hasChosenMode, loadAuth } = useAuthStore();
  const { loadSettings } = useNotificationSettingsStore();
  const { colors, loadTheme } = useThemeStore();

  useEffect(() => {
    loadAuth();
    loadSettings();
    loadTheme();
  }, []);

  const stackHeaderOptions = {
    headerStyle: { backgroundColor: colors.headerBg },
    headerTintColor: colors.headerText,
    headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
    headerBackButtonDisplayMode: 'minimal' as const,
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.headerBg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={colors.statusBar}
        backgroundColor={colors.headerBg}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated || isLocalMode ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ headerShown: true, title: 'Détails du véhicule', ...stackHeaderOptions }}
            />
            <Stack.Screen
              name="AddRefuel"
              component={AddRefuelScreen}
              options={{ headerShown: true, title: 'Ajouter un plein', ...stackHeaderOptions }}
            />
            <Stack.Screen
              name="VehicleMaintenance"
              component={VehicleMaintenanceScreen}
              options={{ headerShown: true, title: 'Entretien véhicule', ...stackHeaderOptions }}
            />
            <Stack.Screen
              name="AddMaintenance"
              component={AddMaintenanceScreen}
              options={{ headerShown: true, title: 'Ajouter un entretien', ...stackHeaderOptions }}
            />
            <Stack.Screen
              name="MaintenanceRules"
              component={MaintenanceRulesScreen}
              options={{ headerShown: true, title: "Règles d'entretien", ...stackHeaderOptions }}
            />
            <Stack.Screen
              name="Insurance"
              component={InsuranceScreen}
              options={{ headerShown: true, title: 'Assurance', ...stackHeaderOptions }}
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
              options={{ headerShown: true, title: 'Mot de passe oublié', ...stackHeaderOptions }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: true, title: 'Mot de passe oublié', ...stackHeaderOptions }}
            />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}
