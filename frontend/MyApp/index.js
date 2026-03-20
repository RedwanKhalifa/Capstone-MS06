if (__DEV__) {
  try {
    const React = require("react");
    const KeepAwake = require("expo-keep-awake");

    if (typeof KeepAwake.useKeepAwake === "function") {
      KeepAwake.useKeepAwake = (tag, _options) => {
        const defaultTag = React.useId();
        const tagOrDefault = tag ?? defaultTag;

        React.useEffect(() => {
          Promise.resolve(KeepAwake.activateKeepAwakeAsync?.(tagOrDefault)).catch(() => {});
          return () => {
            Promise.resolve(KeepAwake.deactivateKeepAwake?.(tagOrDefault)).catch(() => {});
          };
        }, [tagOrDefault]);
      };
    }
  } catch {}
}

require("expo-router/entry");