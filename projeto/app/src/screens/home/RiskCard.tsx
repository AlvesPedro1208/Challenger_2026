import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, PrimaryButton, StatusPill } from '@/components/ui';
import type { RiskState, TrafficAlertState } from '@/state/store';
import { colors, spacing, typography } from '@/theme/tokens';

import type { ArrivalCtaInput, ArrivalCtaVariant } from './arrivalCta';
import { formatCountdown, formatTimeHM } from './format';
import { planLeaveNow, type LeaveNowPlan } from './leaveNow';

export type RiskResolution = 'rebooked' | 'refund' | 'leaving';

type RiskCardProps = {
    risk: RiskState;
    resolution: RiskResolution | null;
    clockIso: string | null;
    departureIso: string;
    trafficAlert: TrafficAlertState | null;
    platform: string;
    showRouteAction: boolean;
    routeVariant: ArrivalCtaInput;
    onRebook: () => void;
    onRefund: () => void;
    onLeaveNow: () => void;
    onReviewOptions: () => void;
    onOpenMap: () => void;
};

export function RiskCard({
    risk,
    resolution,
    clockIso,
    departureIso,
    trafficAlert,
    platform,
    showRouteAction,
    routeVariant,
    onRebook,
    onRefund,
    onLeaveNow,
    onReviewOptions,
    onOpenMap,
}: RiskCardProps) {
    const leavePlan =
        resolution === 'leaving'
            ? planLeaveNow(clockIso, departureIso, trafficAlert?.etaToTerminalMin ?? null)
            : null;

    return (
        <Card style={StyleSheet.riskCard}>
            <View style={styles.riskBar} />
            <Text style={styles.sectionLabel}>Risco de perder o embarque</Text>
            <Text style={styles.riskValue}>{risk.riskPct}%</Text>
            <Text style={styles.riskHint}>
                Dá tempo de decidir agora: sair já para o terminal, remarcar mantendo o valor pago
                ou cancelar com devolução do restante.
            </Text>

            {resolution === 'leaving' ? (
                <LeaveNowSummary
                    plan={leavePlan}
                    platform={platform}
                    showRouteAction={showRouteAction}
                    routeVariant={routeVariant}
                    onOpenMap={onOpenMap}
                    onReviewOptions={onReviewOptions}
                />
            ) : resolution ? (
                    <StatusPill
                        label={
                            resolution === 'rebooked'
                            ? 'Remarcação solicitada'
                            : 'Cancelamento com reembolso solicitado'
                        }
                        tone='success'
                    />
                ) : (
                    <View style={styles.riskActions}>
                        <PrimaryButton
                            label="Remarcar passagem"
                            disabled={!risk.canRebook}
                            onPress={onRebook}
                        />

                        <View style={{ height: 10 }} />

                        <PrimaryButton label="Sair agora" variant="purple"onPress={onLeaveNow} />
                        <GhostButton label="Cancelar com reembolso" onPress={onRefund} />
                    </View>
                )}
        </Card>
    );
}

type LeaveNowSummaryProps = {
    plan: LeaveNowPlan | null;
    platform: string;
    showRouteAction: boolean;
    routeVariant: ArrivalCtaVariant;
    onOpenMap: () => void;
    onReviewOptions: () => void;
};

function marginLabel(plan: LeaveNowPlan, platform: string): string {
    if (plan.marginMin <= 0) {
        return 'Pelo trânsito atual, você chega depois da partida. Remarcar ainda é uma opção.';
    }
    const margin = formatCountdown({
        totalMinutes: plan.marginMin,
        hours: Math.floor(plan.merginMin / 60),
        minutes: plan.marginMin % 60,
    });
    return plan.onTime
        ? `Sobram ${margin} até o embarque na plataforma ${platform}.`
        : `Margem curta: ${margin} até o embarque na plataforma ${platform}.`;
}

function LeaveNowSummary({
    plan,
    platform,
    showRouteAction,
    RouteVariant,
    onOpenMap,
    onReviewOptions,
}: LeaveNowSummaryProps) {
    return (
        <View style={styles.riskActions}>
            <StatusPill
                label="Saída confirmada"
                tone={plan && !plan.onTime ? 'warning' : 'success'}
            />
            {plan ? (
                <>
                    <Text style={styles.leaveTitle}>
                        Chegada ao terminal às {formatTimeHM(plan.terminalArrivalIso)} - em{' '}
                        {plan.etaToTerminalMin} min 
                    </Text>
                    <Text style={styles.riskHint}>{marginLabel(plan, platform)}</Text>
                </>
            ) : (
                <Text style={styles.riskHint}>
                    Sem previsão de trânsito no momento. Acompanhe a rota até o terminal pelo mapa.
                </Text>
            )}
            {showRouteAction ? (
                <PrimaryButton label="Ver rota até o terminal" variant={RouteVariant} onPress={onOpenMap} />
            ) : null}
            <GhostButton label="Rever opções" onPress={onReviewOptions} />
        </View>
    );
}

type GhostButtonProps = {
    label: string;
    onPress: () => void;
};

function GhostButton({ label, onPress }: GhostButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={({ pressed }) => [styles.ghostButton, pressed && styles.ghostPressed]}
        >
            <Text style={styles.ghostLabel}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    sectionLabel: {
        ...typography.sectionLabel,
        color: colors.text.secondary,
    },
    riskCard: {
        padding: spacing.lg,
        gap: spacing.sm,
        overflow: 'hidden',
    },
    riskBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: colors.accent.primary,
    },
    riskValue: {
        fontSize: 56,
        fontWight: '800',
        letterSpacing: -1,
        color: colors.accent.primary,
    },
    riskHint: {
        ...typography.body,
        color: colors.text.secondary,
        lineHeight: 21,
    },
    rickAction: {
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    leaveTitle: {
        ...typography.title,
        color: colors.text.primary,
    },
    ghostButton: {
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
    },
    ghostPressed: {
        opacity: 0.6,
    },
    ghostLabel: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text.secondary,
        textDecorationLine: 'underline',
    },
})