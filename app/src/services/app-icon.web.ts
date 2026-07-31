// expo-dynamic-app-icon has no web implementation (it switches native activity-aliases /
// CFBundleAlternateIcons, concepts that don't exist for a browser tab) — this stub keeps
// the Settings screen's app-icon UI hideable without a platform check at every call site.
export const APP_ICON_SUPPORTED = false;

export function getAppIcon(): string {
  return 'DEFAULT';
}

export function setAppIcon(_name: string): string | false {
  return false;
}
