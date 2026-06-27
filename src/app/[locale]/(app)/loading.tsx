import { AppLoading } from "@/components/AppLoading";

// Shown automatically as the Suspense fallback while any app page renders on the
// server (Day, Schedule, Settings). The Nav lives in the layout, so it stays put;
// only the content area swaps to the sweeping الهمّة logo.
export default function Loading() {
  return <AppLoading />;
}
