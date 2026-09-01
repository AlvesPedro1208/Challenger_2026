/**
 * Structural guard against dead-end screens.
 *
 * The demo drives the router with `replace`, so the stack is often empty and
 * the iOS edge-swipe has nothing to pop: a screen with no visible exit strands
 * the passenger. The tab bar is that exit, and it is on screen for everything
 * rendered inside `app/(tabs)`. This test fails when a new route is added
 * outside that layout without a justified exception, so a screen cannot be born
 * without a way out.
 */
import { describe, expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

import { PHASE_ROUTES } from '../phaseRoutes';

const APP_DIR = path.resolve(__dirname, '../../app');
const TABS_GROUP = '(tabs)';
const TABS_LAYOUT = path.join(APP_DIR, TABS_GROUP, '_layout.tsx');

/**
 * Routes deliberately rendered outside the tab layout. The value is the exit
 * that screen carries instead — an entry with no such exit does not belong here.
 */
const ROUTES_WITHOUT_TAB_BAR: Record<string, string> = {
  'server-settings.tsx':
    'Operator screen, reached only by a long press on the data-source badge. It carries its own back control, aimed at the screen the live phase owns.',
};

/** Route files, relative to the app directory, with layouts and groups' own files skipped. */
function routeFiles(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        return routeFiles(path.join(dir, entry.name), relative);
      }
      if (!entry.name.endsWith('.tsx')) return [];
      // `_layout.tsx` and `+not-found.tsx` are layout/special files, not screens.
      if (entry.name.startsWith('_') || entry.name.startsWith('+')) return [];
      return [relative];
    })
    .sort();
}

const ROUTES = routeFiles(APP_DIR);

function isInsideTabs(route: string): boolean {
  return route.startsWith(`${TABS_GROUP}/`);
}

/** Screen names declared in the tab layout, from its `<Tabs.Screen name="..." />` list. */
function declaredTabScreens(): string[] {
  const source = fs.readFileSync(TABS_LAYOUT, 'utf8');
  return [...source.matchAll(/<Tabs\.Screen\s+name="([^"]+)"/g)]
    .map((match) => match[1])
    .sort();
}

describe('route exits', () => {
  it('finds the routes of the app', () => {
    expect(ROUTES.length).toBeGreaterThan(0);
  });

  it('renders every route inside the tab layout, or with a justified exception', () => {
    const stranded = ROUTES.filter(
      (route) => !isInsideTabs(route) && ROUTES_WITHOUT_TAB_BAR[route] === undefined,
    );

    expect(stranded).toEqual([]);
  });

  it('keeps the exception list free of routes that no longer exist', () => {
    const stale = Object.keys(ROUTES_WITHOUT_TAB_BAR).filter(
      (route) => !ROUTES.includes(route),
    );

    expect(stale).toEqual([]);
  });

  it('declares every screen of the tab layout in the tab bar', () => {
    const inTabs = ROUTES.filter(isInsideTabs).map((route) =>
      route.slice(TABS_GROUP.length + 1).replace(/\.tsx$/, ''),
    );

    expect(declaredTabScreens()).toEqual([...inTabs].sort());
  });

  it('shows the four tabs the passenger navigates by', () => {
    const source = fs.readFileSync(TABS_LAYOUT, 'utf8');

    for (const label of ['Viagem', 'Mapa', 'Bilhete', 'Pontualidade']) {
      expect(source).toContain(`title: '${label}'`);
    }
  });

  it('lands every journey phase on a screen that keeps the tab bar', () => {
    const targets = Object.values(PHASE_ROUTES).map((route) =>
      route === '/' ? 'index.tsx' : `${route.slice(1)}.tsx`,
    );

    for (const target of targets) {
      expect(ROUTES).toContain(`${TABS_GROUP}/${target}`);
    }
  });
});
