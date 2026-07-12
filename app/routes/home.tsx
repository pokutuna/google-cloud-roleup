import { GripVertical, PanelLeftOpen } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComparePane } from "../components/ComparePane";
import { DetailPane } from "../components/DetailPane";
import { GuidePane } from "../components/GuidePane";
import { HeaderBar } from "../components/HeaderBar";
import { ReversePane } from "../components/ReversePane";
import { RoleList } from "../components/RoleList";
import { isServiceAgent, loadDataset } from "../lib/data";
import { useT } from "../lib/i18n";
import { detectLang, getMessage } from "../lib/i18n-data";
import { filterRoles, parseQuery } from "../lib/search";
import { useExplorerState } from "../lib/url-state";
import { useIsMobile } from "../lib/use-media-query";
import type { Route } from "./+types/home";

const SIDEBAR_DEFAULT_WIDTH = 440;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 640;

const SITE_URL = "https://pokutuna.github.io/google-cloud-roleup/";
const SITE_TITLE = "Google Cloud RoleUp";

export function meta(_: Route.MetaArgs) {
  const description = getMessage(detectLang(), "app.metaDescription");
  return [
    { title: SITE_TITLE },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: SITE_URL },
    { property: "og:type", content: "website" },
    { property: "og:url", content: SITE_URL },
    { property: "og:title", content: SITE_TITLE },
    { property: "og:description", content: description },
    { property: "og:locale", content: "ja_JP" },
    { property: "og:locale:alternate", content: "en_US" },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: SITE_TITLE },
    { name: "twitter:description", content: description },
  ];
}

export async function clientLoader(_: Route.ClientLoaderArgs) {
  return loadDataset();
}

export default function Home({ loaderData: ds }: Route.ComponentProps) {
  const t = useT();
  const state = useExplorerState();
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<"list" | "pane">("list");
  const [expanded, setExpanded] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; width: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { x: e.clientX, width: sidebarWidth };
      setDragging(true);
    },
    [sidebarWidth],
  );
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStart.current) return;
      const delta = e.clientX - dragStart.current.x;
      const next = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, dragStart.current.width + delta),
      );
      setSidebarWidth(next);
    },
    [],
  );
  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.releasePointerCapture(e.pointerId);
      dragStart.current = null;
      setDragging(false);
    },
    [],
  );

  // mobile: wrap state so row/permission clicks auto-switch to the pane tab,
  // while checkbox toggles (comparison) keep the user on the list tab
  const mobileState = useMemo(
    () =>
      isMobile
        ? {
            ...state,
            select: (item: Parameters<typeof state.select>[0]) => {
              state.select(item);
              setMobileTab("pane");
            },
            anchorPerm: (name: string) => {
              state.anchorPerm(name);
              setMobileTab("pane");
            },
          }
        : state,
    [isMobile, state],
  );

  useEffect(() => {
    if (isMobile && state.selection.length === 0) setMobileTab("list");
  }, [isMobile, state.selection.length]);

  const filtered = useMemo(() => {
    const idxs = filterRoles(ds, parseQuery(state.q));
    return state.showServiceAgents
      ? idxs
      : idxs.filter((i) => !isServiceAgent(ds.roles[i]));
  }, [ds, state.q, state.showServiceAgents]);

  // total roles with no query filter, under current display settings —
  // the denominator for RoleList's "n / N ロール" indicator
  const totalRoleCount = useMemo(() => {
    return state.showServiceAgents
      ? ds.roles.length
      : ds.roles.filter((r) => !isServiceAgent(r)).length;
  }, [ds, state.showServiceAgents]);

  // resolve selection to indexes; permission anchor wins for the right pane
  const selRoleIdxs = state.selection.reduce<number[]>((indexes, item) => {
    if (item.type !== "r") return indexes;
    const index = ds.roleIndexByName.get(`roles/${item.name}`);
    if (index !== undefined) indexes.push(index);
    return indexes;
  }, []);
  const permAnchor = [...state.selection]
    .reverse()
    .find((it) => it.type === "p");
  const permId = permAnchor ? ds.permIdByName.get(permAnchor.name) : undefined;

  // pass mobileState on mobile (so select/anchorPerm trigger tab switches),
  // the raw state on desktop (behavior unchanged)
  const paneState = isMobile ? mobileState : state;

  const rightPane =
    permId !== undefined ? (
      <ReversePane ds={ds} state={paneState} permId={permId} />
    ) : selRoleIdxs.length >= 2 ? (
      <ComparePane ds={ds} state={paneState} roleIndexes={selRoleIdxs} />
    ) : selRoleIdxs.length === 1 ? (
      <DetailPane ds={ds} state={paneState} roleIndex={selRoleIdxs[0]} />
    ) : (
      <GuidePane state={paneState} />
    );

  const roleList = (
    <RoleList
      ds={ds}
      state={paneState}
      roleIndexes={filtered}
      totalCount={totalRoleCount}
      onCollapse={isMobile ? undefined : () => setExpanded(true)}
    />
  );

  const paneTabLabel =
    permId !== undefined
      ? t("home.tabReverse")
      : selRoleIdxs.length >= 2
        ? t("home.tabCompare", { n: selRoleIdxs.length })
        : t("home.tabDetail");

  return (
    <div
      className={`flex h-dvh flex-col text-gray-900 dark:text-gray-100 ${dragging ? "select-none" : ""}`}
    >
      <HeaderBar ds={ds} state={state} />
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 border-b border-gray-200 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setMobileTab("list")}
              aria-pressed={mobileTab === "list"}
              className={`flex-1 border-b-2 px-3 py-2 text-center text-sm font-medium cursor-pointer ${
                mobileTab === "list"
                  ? "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {t("home.tabList")}
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("pane")}
              aria-pressed={mobileTab === "pane"}
              className={`flex-1 border-b-2 px-3 py-2 text-center text-sm font-medium cursor-pointer ${
                mobileTab === "pane"
                  ? "border-purple-600 text-purple-700 dark:border-purple-400 dark:text-purple-300"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {paneTabLabel}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {mobileTab === "list" ? (
              <div className="h-full w-full">{roleList}</div>
            ) : (
              <div className="h-full w-full">{rightPane}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {!expanded && (
            <>
              <aside
                style={{ width: sidebarWidth }}
                className="shrink-0 border-r border-gray-200 dark:border-gray-800"
              >
                {roleList}
              </aside>
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="group relative z-10 -ml-1 w-2 shrink-0 cursor-col-resize touch-none"
              >
                <div
                  className={`pointer-events-none absolute top-1/2 left-1/2 flex h-6 w-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gray-200 text-gray-500 opacity-0 dark:bg-gray-700 dark:text-gray-400 ${
                    dragging
                      ? "opacity-100"
                      : "group-hover:opacity-100 transition-opacity"
                  }`}
                >
                  <GripVertical size={12} />
                </div>
              </div>
            </>
          )}
          <main className="relative min-w-0 flex-1">
            {expanded && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                title={t("home.showList")}
                aria-label={t("home.showList")}
                className="absolute top-2 left-2 z-20 rounded border border-gray-200 bg-white p-1 text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-300 cursor-pointer"
              >
                <PanelLeftOpen size={14} />
              </button>
            )}
            {rightPane}
          </main>
        </div>
      )}
    </div>
  );
}
