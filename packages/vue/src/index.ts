import {
  computed,
  defineComponent,
  h,
  inject,
  onMounted,
  onUnmounted,
  provide,
  ref,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from "vue";
import {
  createAbbyInstance,
  type ABTestReturnValue,
  type AbbyConfig,
  type AbbyDataResponse,
  type AbbyProjectData,
  type BaseConfigSchema,
  type FlagValue,
  type Infer,
  type RemoteConfigType,
  type RemoteConfigValueStringToType,
} from "@tryabby/core";

export const ABBY_INJECTION_KEY: InjectionKey<{
  data: ComputedRef<AbbyProjectData | null>;
}> = Symbol("AbbyVueContext");

export function createAbby<
  const TConfig extends BaseConfigSchema,
  Tests extends TConfig["tests"],
  FlagName extends TConfig["flags"][number],
  RemoteConfig extends TConfig["remoteConfig"],
  RemoteConfigName extends keyof RemoteConfig,
  User extends TConfig["user"],
>(config: AbbyConfig<TConfig>) {
  const abby = createAbbyInstance(config);
  const reactiveState = ref<AbbyProjectData | null>(abby.getProjectData());

  const ensureSubscribed = () => {
    return abby.subscribe((nextData: AbbyProjectData) => {
      reactiveState.value = nextData;
    });
  };

  const AbbyProvider = defineComponent({
    name: "AbbyProvider",
    props: {
      initialData: {
        type: Object as PropType<AbbyDataResponse>,
        required: false,
      },
    },
    setup(props, { slots }) {
      if (props.initialData) {
        reactiveState.value = abby.init(props.initialData);
      }

      let unsubscribe: (() => void) | undefined;

      onMounted(() => {
        if (!props.initialData) {
          abby.loadProjectData().then((loaded: AbbyProjectData | null) => {
            if (loaded) {
              reactiveState.value = loaded;
            }
          });
        }
        unsubscribe = ensureSubscribed();
      });

      onUnmounted(() => {
        if (unsubscribe) unsubscribe();
      });

      const contextValue = {
        data: computed(() => reactiveState.value),
      };
      provide(ABBY_INJECTION_KEY, contextValue);

      return () => (slots.default ? slots.default() : h("div"));
    },
  });

  const useAbbyData = (): ComputedRef<AbbyProjectData> => {
    const injected = inject(ABBY_INJECTION_KEY, null);
    return computed(() => {
      const current = injected?.data.value ?? reactiveState.value ?? abby.getProjectData();
      if (!current) {
        throw new Error("[Abby] Project data is not initialized. Wrap your tree in <AbbyProvider> or provide initialData.");
      }
      return current;
    });
  };

  /**
   * Returns the user's currently selected variant for the given A/B test along with the onAct callback.
   */
  const useAbby = <
    TestName extends keyof Tests,
    TestVariant extends Tests[TestName]["variants"][number],
    LookupValue = undefined,
    const Lookup extends Record<TestVariant, LookupValue> | undefined = undefined,
  >(
    testName: TestName,
    lookupObject?: Lookup
  ): {
    variant: ComputedRef<ABTestReturnValue<Lookup, TestVariant>>;
    onAct: () => Promise<void>;
  } => {
    const dataRef = useAbbyData();
    const variant = computed(() => {
      const rawVariant = (dataRef.value?.tests?.[testName as string]?.variant ??
        abby.getTestVariant(testName)) as TestVariant;
      if (lookupObject === undefined) {
        return rawVariant as ABTestReturnValue<Lookup, TestVariant>;
      }
      return lookupObject[rawVariant] as ABTestReturnValue<Lookup, TestVariant>;
    });

    const onAct = async () => {
      await abby.onAct(testName);
    };

    return {
      variant,
      onAct,
    };
  };

  /**
   * Returns a reactive ComputedRef with the boolean value of the requested feature flag.
   */
  const useFeatureFlag = (flagName: FlagName): ComputedRef<FlagValue> => {
    const dataRef = useAbbyData();
    return computed(() => {
      if (dataRef.value?.flags && flagName in dataRef.value.flags) {
        return dataRef.value.flags[flagName as string].value;
      }
      return abby.getFeatureFlag(flagName);
    });
  };

  /**
   * Returns a reactive ComputedRef with the strongly-typed value of the requested remote config key.
   */
  const useRemoteConfig = <
    T extends RemoteConfigName,
    Config extends RemoteConfig[T],
  >(
    remoteConfigName: T
  ): ComputedRef<RemoteConfigValueStringToType<Config>> => {
    const dataRef = useAbbyData();
    return computed(() => {
      if (dataRef.value?.remoteConfig && (remoteConfigName as string) in dataRef.value.remoteConfig) {
        return dataRef.value.remoteConfig[remoteConfigName as string]
          .value as RemoteConfigValueStringToType<Config>;
      }
      return abby.getRemoteConfig(remoteConfigName);
    });
  };

  const getFeatureFlagValue = (name: FlagName): FlagValue => abby.getFeatureFlag(name);

  const getRemoteConfig = <
    T extends RemoteConfigName,
    Config extends RemoteConfig[T],
  >(
    remoteConfigName: T
  ): RemoteConfigValueStringToType<Config> => abby.getRemoteConfig(remoteConfigName);

  const getVariants = <T extends keyof Tests>(name: T) => abby.getVariants(name);

  const updateUserProperties = (
    user: Partial<{
      -readonly [K in keyof User]: Infer<User[K]>;
    }>
  ) => {
    abby.updateUserProperties(user);
  };

  return {
    AbbyProvider,
    useAbby,
    useFeatureFlag,
    useRemoteConfig,
    getFeatureFlagValue,
    getRemoteConfig,
    getVariants,
    updateUserProperties,
    __abby__: abby,
  };
}
