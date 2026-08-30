import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { NOVO_RIO_POIS, USER_ROUTE_STATS } from '@jornada/shared';

import { PrimaryButton, Screen } from '@/components/ui';
import {
  selectArrived,
  selectBus,
  selectClockIso,
  selectTrip,
  useJourneyStore,
} from '@/state/store';
import { colors, spacing, typography } from '@/theme/tokens';

import {
  extractHour,
  filterMealPois,
  filterServicePois,
  getGreeting,
  getMealPeriod,
  getMealSectionTitle,
  parseDestination,
  welcomeMessage,
} from './arrivalLogic';
import { PoiCard } from './PoiCard';
import { RouteHistoryCard } from './RouteHistoryCard';
import { WelcomeHeader } from './WelcomeHeader';

const MAX_MEAL_SUGGESTIONS = 3;

export function ArrivalScreen() {
  const router = useRouter();
  const trip = useJourneyStore(selectTrip);
  const clockIso = useJourneyStore(selectClockIso);
  const bus = useJourneyStore(selectBus);
  const arrived = useJourneyStore(selectArrived);

  const destination = trip ? parseDestination(trip.destination) : null;
  const terminal = destination?.terminal ?? null;

  if (!arrived) {
    return (
      <Screen>
        <Text style={styles.title}>Chegada</Text>
        <Text style={styles.meta}>
          {destination
            ? `Destino: ${destination.city}${terminal ? ` · ${terminal}` : ''}`
            : 'Destino da viagem'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.previewText}>
            Ao desembarcar, você vê aqui as boas-vindas, o que está aberto perto do terminal
            e o seu histórico nesta rota.
          </Text>
        </View>

        <View style={styles.section}>
          <RouteHistoryCard stats={USER_ROUTE_STATS} trip={trip} includeCurrentTrip={false} />
        </View>

        <View style={styles.section}>
          <PrimaryButton label="Acompanhar no mapa" onPress={() => router.push('/map')} />
        </View>
      </Screen>
    );
  }

  const hour = extractHour(clockIso);
  const period = getMealPeriod(hour);
  const mealPois = filterMealPois(NOVO_RIO_POIS, period).slice(0, MAX_MEAL_SUGGESTIONS);
  const servicePois = filterServicePois(NOVO_RIO_POIS);

  return (
    <Screen>
      <WelcomeHeader
        greeting={getGreeting(hour)}
        welcome={destination ? welcomeMessage(destination.city) : 'Bem-vindo ao destino'}
        terminal={terminal}
        period={period}
        delayMin={bus.delayMin}
      />

      {mealPois.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{getMealSectionTitle(period)}</Text>
          {mealPois.map((poi) => (
            <PoiCard key={poi.id} poi={poi} terminal={terminal} />
          ))}
        </View>
      ) : null}

      {servicePois.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Serviços por perto</Text>
          {servicePois.map((poi) => (
            <PoiCard key={poi.id} poi={poi} terminal={terminal} />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <RouteHistoryCard stats={USER_ROUTE_STATS} trip={trip} includeCurrentTrip />
      </View>

      <View style={styles.section}>
        <PrimaryButton label="Ver o terminal no mapa" onPress={() => router.push('/map')} />
      </View>

      <View style={styles.secondaryAction}>
        <PrimaryButton
          label="Ver pontualidade desta rota"
          variant="purple"
          onPress={() => router.push('/stats')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  meta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  previewText: {
    ...typography.body,
    color: colors.text.primary,
  },
  section: {
    marginTop: spacing.md,
  },
  secondaryAction: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
});
