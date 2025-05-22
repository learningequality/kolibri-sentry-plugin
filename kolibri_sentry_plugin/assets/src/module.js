import * as Sentry from '@sentry/vue';
import kolibri from 'kolibri';
import plugin_data from 'kolibri-plugin-data';
import Vue from 'vue';
import store from 'kolibri/store';
import { currentLanguage } from 'kolibri/utils/i18n';
import { useUser } from 'kolibri/composables';
import { watch } from 'vue';

if (plugin_data.sentryDSN) {
  const initOptions = {
    Vue: Vue,
    dsn: plugin_data.sentryDSN,
    environment: plugin_data.sentryEnv,
    release: kolibri.version,
    integrations: [],
  };
  if (plugin_data.sentryReplayEnabled) {
    // By default record 10% of all sessions
    initOptions.replaysSessionSampleRate = 0.1;
    // Record 100% of all error sessions
    initOptions.replaysOnErrorSampleRate = 1.0;
    initOptions.integrations.push(
      Sentry.replayIntegration({
        // Kolibri collects and contains minimal PII, so we don't mask anything here.
        maskAllText: false,
        maskAllInputs: false,
        blockAllMedia: false,
      }),
    );
  }
  Sentry.init(initOptions);
  Sentry.setTag('lang', currentLanguage);
  Sentry.setTag('host', window.location.hostname);
  store.watch(
    state => state.error,
    errorString => {
      if (errorString) {
        Sentry.captureException(errorString);
      }
    },
  );

  const {
    currentUserId,
    full_name,
    username,
    facility_id,
    kind,
    isUserLoggedIn,
  } = useUser();

  watch(
    () => currentUserId.value, // Watch the .value of the currentUserId ref
    newUserIdValue => { // Renamed for clarity: this is the new value of currentUserId.value
      if (isUserLoggedIn.value) {
        Sentry.setUser({
          id: newUserIdValue, // Map currentUserId.value to Sentry's 'id' field
          full_name: full_name.value,
          username: username.value,
          facility_id: facility_id.value,
          type: JSON.stringify(kind.value), // kind itself is a ref
        });
      } else {
        Sentry.setUser(null);
      }
    },
    { immediate: true },
  );
}
