import { type ComponentType } from 'react';
import { type LucideIcon } from 'lucide-react';
import { org } from './org';

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
  key: keyof typeof org.features;
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

export function getEnabledFeatures() {
  return featureRegistry.filter(f => org.features[f.key]);
}

export function getEnabledNavItems(profile: any) {
  return getEnabledFeatures()
    .filter(f => f.navItem)
    .filter(f => !f.visibilityCheck || f.visibilityCheck(profile))
    .map(f => f.navItem!)
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
    .filter(f => f.dashboardCard)
    .map(f => ({ key: f.key, component: f.dashboardCard! }));
}

export function getEnabledChapterTabs() {
  return getEnabledFeatures()
    .filter(f => f.chapterTab)
    .map(f => f.chapterTab!);
}
