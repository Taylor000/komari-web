import React, { lazy, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

type RouteModule = { default: ComponentType };
type RouteImporter = () => Promise<RouteModule>;

const routeImporters: Record<string, RouteImporter> = {
  "/": () => import("./pages/Index"),
  "/_layout": () => import("./pages/_layout"),
  "/instance/:uuid": () => import("./pages/instance"),
  "/kidding": () => import("./pages/admin"),
  "/kidding/server-groups": () => import("./pages/admin/serverGroups"),
  "/kidding/subscriptions": () => import("./pages/admin/subscriptions"),
  "/kidding/_layout": () => import("./pages/admin/_layout"),
  "/kidding/theme_managed": () => import("./pages/admin/theme_managed"),
  "/kidding/sessions": () => import("./pages/admin/sessions"),
  "/kidding/account": () => import("./pages/admin/account"),
  "/kidding/settings": () => import("./pages/admin/settings/_layout"),
  "/kidding/settings/site": () => import("./pages/admin/settings/site"),
  "/kidding/settings/theme": () => import("./pages/admin/settings/theme"),
  "/kidding/settings/custom": () => import("./pages/admin/settings/custom"),
  "/kidding/settings/sign-on": () => import("./pages/admin/settings/sign-on"),
  "/kidding/settings/notification": () =>
    import("./pages/admin/settings/notification"),
  "/kidding/settings/general": () => import("./pages/admin/settings/general"),
  "/kidding/notification/offline": () =>
    import("./pages/admin/notification/offline"),
  "/kidding/notification/load": () => import("./pages/admin/notification/load"),
  "/kidding/notification/general": () =>
    import("./pages/admin/notification/general"),
  "/kidding/ping": () => import("./pages/admin/pingTask"),
  "/kidding/logs": () => import("./pages/admin/log"),
  "/terminal": () => import("./pages/terminal"),
  "/manage": () => import("./pages/manage"),
  "/404": () => import("./pages/404"),
};

const retryKey = (path: string) => `komari:route-retry:${path}`;

function lazyRoute(path: string) {
  const importer = routeImporters[path];
  return lazy(async () => {
    try {
      const module = await importer();
      sessionStorage.removeItem(retryKey(path));
      return module;
    } catch (error) {
      const key = retryKey(path);
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
        return new Promise<RouteModule>(() => undefined);
      }
      sessionStorage.removeItem(key);
      throw error;
    }
  });
}

/**
 * Warm the route chunk while a user points at or focuses a menu item.
 * Failed speculative loads are ignored; the route boundary handles a real
 * navigation failure with a single clean reload.
 */
export function preloadRoute(path: string) {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const imports: RouteImporter[] = [];

  if (pathname.startsWith("/kidding")) {
    imports.push(routeImporters["/kidding/_layout"]);
  }
  if (pathname.startsWith("/kidding/settings/")) {
    imports.push(routeImporters["/kidding/settings"]);
  }
  if (routeImporters[pathname]) {
    imports.push(routeImporters[pathname]);
  }

  void Promise.all(imports.map((importer) => importer())).catch(() => undefined);
}

const Index = lazyRoute("/");
const PublicLayout = lazyRoute("/_layout");
const Instance = lazyRoute("/instance/:uuid");
const AdminLayout = lazyRoute("/kidding/_layout");
const Admin = lazyRoute("/kidding");
const ServerGroups = lazyRoute("/kidding/server-groups");
const Subscriptions = lazyRoute("/kidding/subscriptions");
const ThemeManaged = lazyRoute("/kidding/theme_managed");
const Sessions = lazyRoute("/kidding/sessions");
const Account = lazyRoute("/kidding/account");
const SettingsLayout = lazyRoute("/kidding/settings");
const SiteSettings = lazyRoute("/kidding/settings/site");
const ThemeSettings = lazyRoute("/kidding/settings/theme");
const CustomSettings = lazyRoute("/kidding/settings/custom");
const SignOnSettings = lazyRoute("/kidding/settings/sign-on");
const NotificationSettings = lazyRoute("/kidding/settings/notification");
const GeneralSettings = lazyRoute("/kidding/settings/general");
const OfflineNotification = lazyRoute("/kidding/notification/offline");
const LoadNotification = lazyRoute("/kidding/notification/load");
const GeneralNotification = lazyRoute("/kidding/notification/general");
const Ping = lazyRoute("/kidding/ping");
const Logs = lazyRoute("/kidding/logs");
const Terminal = lazyRoute("/terminal");
const Manage = lazyRoute("/manage");
const NotFound = lazyRoute("/404");

export const routes: RouteObject[] = [
  {
    path: "/",
    element: React.createElement(PublicLayout),
    children: [
      { index: true, element: React.createElement(Index) },
      {
        path: "instance/:uuid",
        element: React.createElement(Instance),
      },
    ],
  },
  {
    path: "/kidding",
    element: React.createElement(AdminLayout),
    children: [
      { index: true, element: React.createElement(Admin) },
      {
        path: "server-groups",
        element: React.createElement(ServerGroups),
      },
      {
        path: "subscriptions",
        element: React.createElement(Subscriptions),
      },
      {
        path: "theme_managed",
        element: React.createElement(ThemeManaged),
      },
      {
        path: "sessions",
        element: React.createElement(Sessions),
      },
      {
        path: "account",
        element: React.createElement(Account),
      },
      {
        path: "settings",
        element: React.createElement(SettingsLayout),
        children: [
          { path: "site", element: React.createElement(SiteSettings) },
          { path: "theme", element: React.createElement(ThemeSettings) },
          { path: "custom", element: React.createElement(CustomSettings) },
          { path: "sign-on", element: React.createElement(SignOnSettings) },
          {
            path: "notification",
            element: React.createElement(NotificationSettings),
          },
          { path: "general", element: React.createElement(GeneralSettings) },
        ],
      },
      {
        path: "notification",
        children: [
          { path: "offline", element: React.createElement(OfflineNotification) },
          { path: "load", element: React.createElement(LoadNotification) },
          { path: "general", element: React.createElement(GeneralNotification) },
        ],
      },
      { path: "ping", element: React.createElement(Ping) },
      { path: "logs", element: React.createElement(Logs) },
    ],
  },
  {
    path: "/terminal",
    element: React.createElement(Terminal),
  },
  {
    path: "/manage/*",
    element: React.createElement(Manage),
  },
  { path: "*", element: React.createElement(NotFound) },
];
