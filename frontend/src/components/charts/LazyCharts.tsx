import { Component, lazy, Suspense, type ReactNode } from 'react';
import { Skeleton } from '../ui/Feedback';
import { Icon } from '../ui/Icon';

const load = () => import('./Charts');
const TrendChartLazy = lazy(() => load().then((m) => ({ default: m.TrendChart })));
const CategoryDonutLazy = lazy(() => load().then((m) => ({ default: m.CategoryDonut })));
const DailyBarChartLazy = lazy(() => load().then((m) => ({ default: m.DailyBarChart })));
const BudgetVsActualChartLazy = lazy(() => load().then((m) => ({ default: m.BudgetVsActualChart })));

/** A chart failure degrades to a small notice; it never takes down the page's numbers. */
class ChartErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-body-sm text-subtle">
          <Icon name="monitoring" size={24} />
          Chart unavailable — the figures above are unaffected.
        </div>
      );
    }
    return this.props.children;
  }
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <ChartErrorBoundary>
      <Suspense fallback={<Skeleton className="h-full w-full" />}>{children}</Suspense>
    </ChartErrorBoundary>
  );
}

type Props<T> = T extends (props: infer P) => unknown ? P : never;
type ChartsModule = typeof import('./Charts');

export const TrendChart = (p: Props<ChartsModule['TrendChart']>) => (
  <Frame>
    <TrendChartLazy {...p} />
  </Frame>
);
export const CategoryDonut = (p: Props<ChartsModule['CategoryDonut']>) => (
  <Frame>
    <CategoryDonutLazy {...p} />
  </Frame>
);
export const DailyBarChart = (p: Props<ChartsModule['DailyBarChart']>) => (
  <Frame>
    <DailyBarChartLazy {...p} />
  </Frame>
);
export const BudgetVsActualChart = (p: Props<ChartsModule['BudgetVsActualChart']>) => (
  <Frame>
    <BudgetVsActualChartLazy {...p} />
  </Frame>
);

