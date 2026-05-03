import { type ComponentType } from 'react';
import { type LucideIcon } from 'lucide-react';
import type { FeatureKey } from './capabilities';
import { isCapabilityEnabled } from './capabilities';

export interface FeatureRoute {
  path: string;
  component: ComponentType;
}

export interface FeatureNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  position?: number;
}

export interface FeatureChapterTab {
  key: string;
  label: string;
  icon: LucideIcon;
  component: ComponentType;
}

export interface FeatureDefinition {
  key: FeatureKey;
  /** Repo-relative paths owned by this feature (used for SKU stripping). */
  paths: string[];
  /** Other feature keys this module hard-depends on at import level. */
  dependsOn?: FeatureKey[];
  route?: FeatureRoute;
  additionalRoutes?: FeatureRoute[];
  navItem?: FeatureNavItem;
  dashboardCard?: ComponentType;
  chapterTab?: FeatureChapterTab;
  visibilityCheck?: (profile: any) => boolean;
}

const featureRegistry: FeatureDefinition[] = [];

export function registerFeature(def: FeatureDefinition) {
  featureRegistry.push(def);
}

export function getRegisteredFeatures(): readonly FeatureDefinition[] {
  return featureRegistry;
}

export function getEnabledFeatures() {
  return featureRegistry.filter((f) => isCapabilityEnabled(f.key));
}

export function getEnabledNavItems(profile: any) {
  return getEnabledFeatures()
    .filter((f) => f.navItem)
    .filter((f) => !f.visibilityCheck || f.visibilityCheck(profile))
    .map((f) => f.navItem!)
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
}

export function getEnabledRoutes() {
  const features = getEnabledFeatures();
  const routes: FeatureRoute[] = [];
  for (const f of features) {
    if (f.route) routes.push(f.route);
    if (f.additionalRoutes) routes.push(...f.additionalRoutes);
  }
  return routes;
}

export function getEnabledDashboardCards() {
  return getEnabledFeatures()
    .filter((f) => f.dashboardCard)
    .map((f) => ({ key: f.key, component: f.dashboardCard! }));
}

export function getEnabledChapterTabs() {
  return getEnabledFeatures()
    .filter((f) => f.chapterTab)
    .map((f) => f.chapterTab!);
}
