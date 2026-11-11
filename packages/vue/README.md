# `@tryabby/vue`

Official Vue 3 & Nuxt composable integration for [Abby](https://tryabby.com) (`#68`).

## Features
- `useAbby(testName, lookupObject?)`: Reactive `variant` `ComputedRef` + `onAct` conversion tracker
- `useFeatureFlag(flagName)`: Reactive boolean feature flag composable
- `useRemoteConfig(configName)`: Strongly-typed reactive remote configuration composable
- `<AbbyProvider>`: Vue 3 `provide` / `inject` provider component with SSR `initialData` hydration support
