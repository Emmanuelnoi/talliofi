/**
 * App.tsx is no longer the root component.
 * The router in src/app/router.tsx handles all routing.
 * This file is kept for backward compatibility with existing tests.
 */
export default function App() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <h1 className="text-4xl font-bold">Talliofi</h1>
    </div>
  );
}
