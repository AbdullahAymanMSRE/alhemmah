// The app's loading state: the sweeping الهمّة wordmark, centered in the content
// area. Shared by the segment-level loading.tsx and the day page's keyed Suspense
// so navigating pages and stepping days look identical.
export function AppLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <span
        dir="rtl"
        className="logo-loading font-[family-name:var(--font-logo)] text-6xl leading-none"
      >
        الهمّة
      </span>
    </div>
  );
}
