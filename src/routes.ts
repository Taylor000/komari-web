import React, { lazy, type ComponentType } from "react";
import type { RouteObject } from "react-router-dom";

type RouteModule = { default: ComponentType };
type RouteImporter = () => Promise<RouteModule>;

const routeImporters: Record<string, RouteImporter> = {
  "/": () => import("./pages/Index"),
  "/_layout": () => import("./pages/_layout"),
  "/instance/:uuid": () => import("./pages/instance"),
  "/admin": () => import("./pages/admin"),
  "/admin/_layout": () => import("./pages/admin/_layout"),
  "/admin/theme_managed": () => import("./pages/admin/theme_managed"),
  "/admin/sessions": () => import("./pages/admin/sessions"),
  "/admin/account": () => import("./pages/admin/account"),
  "/admin/settings": () => import("./pages/admin/settings/_layout"),
  "/admin/settings/site": () => import("./pages/admin/settings/site"),
  "/admin/settings/theme": () => import("./pages/admin/settings/theme"),
  "/admin/settings/custom": () => import("./pages/admin/settings/custom"),
  "/admin/settings/sign-on": () => import("./pages/admin/settings/sign-on"),
  "/admin/settings/notification": () =>
    import("./pages/admin/settings/notification"),
  "/admin/settings/general": () => import("./pages/admin/settings/general"),
  "/admin/notification/offline": () =>
    import("./pages/admin/notification/offline"),
  "/admin/notification/load": () => import("./pages/admin/notification/load"),
  "/admin/notification/general": () =>
    import("./pages/admin/notification/general"),
  "/admin/ping": () => import("./pages/admin/pingTask"),
  "/admin/logs": () => import("./pages/admin/log"),
  "/admin/exec": () => import("./pages/admin/exec"),
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

  if (pathname.startsWith("/admin")) {
    imports.push(routeImporters["/admin/_layout"]);
  }
  if (pathname.startsWith("/admin/settings/")) {
    imports.push(routeImporters["/admin/settings"]);
  }
  if (routeImporters[pathname]) {
    imports.push(routeImporters[pathname]);
  }

  void Promise.all(imports.map((importer) => importer())).catch(() => undefined);
}

const Index = lazyRoute("/");
const PublicLayout = lazyRoute("/_layout");
const Instance = lazyRoute("/instance/:uuid");
const AdminLayout = lazyRoute("/admin/_layout");
const Admin = lazyRoute("/admin");
const ThemeManaged = lazyRoute("/admin/theme_managed");
const Sessions = lazyRoute("/admin/sessions");
const Account = lazyRoute("/admin/account");
const SettingsLayout = lazyRoute("/admin/settings");
const SiteSettings = lazyRoute("/admin/settings/site");
const ThemeSettings = lazyRoute("/admin/settings/theme");
const CustomSettings = lazyRoute("/admin/settings/custom");
const SignOnSettings = lazyRoute("/admin/settings/sign-on");
const NotificationSettings = lazyRoute("/admin/settings/notification");
const GeneralSettings = lazyRoute("/admin/settings/general");
const OfflineNotification = lazyRoute("/admin/notification/offline");
const LoadNotification = lazyRoute("/admin/notification/load");
const GeneralNotification = lazyRoute("/admin/notification/general");
const Ping = lazyRoute("/admin/ping");
const Logs = lazyRoute("/admin/logs");
const Exec = lazyRoute("/admin/exec");
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
    path: "/admin",
    element: React.createElement(AdminLayout),
    children: [
      { index: true, element: React.createElement(Admin) },
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
      { path: "exec", element: React.createElement(Exec) },
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
