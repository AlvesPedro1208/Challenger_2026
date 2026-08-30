import { describe, expect, it, jest } from '@jest/globals';

import { BACK_FALLBACK_ROUTE, navigateBack, type BackRouter } from '../backNavigation';

function fakeRouter(canGoBack: boolean) {
  const back = jest.fn();
  const replace = jest.fn();
  const router = { canGoBack: () => canGoBack, back, replace } as unknown as BackRouter;
  return { router, back, replace };
}

describe('navigateBack', () => {
  it('pops the stack when the screen was pushed on top of another one', () => {
    const { router, back, replace } = fakeRouter(true);

    navigateBack(router);

    expect(back).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });

  it('falls back to the home route when the screen replaced the whole stack', () => {
    const { router, back, replace } = fakeRouter(false);

    navigateBack(router);

    expect(back).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith(BACK_FALLBACK_ROUTE);
  });

  it('falls back to a route the phase navigation also uses', () => {
    expect(BACK_FALLBACK_ROUTE).toBe('/');
  });
});
