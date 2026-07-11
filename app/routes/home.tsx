import { GripVertical, PanelLeftOpen } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { ComparePane } from "../components/ComparePane";
import { DetailPane } from "../components/DetailPane";
import { GuidePane } from "../components/GuidePane";
import { HeaderBar } from "../components/HeaderBar";
import { ReversePane } from "../components/ReversePane";
import { RoleList } from "../components/RoleList";
import { isServiceAgent, loadDataset } from "../lib/data";
import { detectLang, getMessage, useT } from "../lib/i18n";
import { filterRoles, parseQuery } from "../lib/search";
import { useExplorerState } from "../lib/url-state";
import type { Route } from "./+types/home";

const SIDEBAR_DEFAULT_WIDTH = 380;
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 640;

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Google Cloud RoleUp" },
    {
      name: "description",
      content: getMessage(detectLang(), "app.metaDescription"),
    },
  ];
}

export async function clientLoader(_: Route.ClientLoaderArgs) {
  return loadDataset();
}

export default function Home({ loaderData: ds }: Route.ComponentProps) {
  const t = useT();
  const state = useExplorerState();
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
  const selRoleIdxs = state.selection
    .filter((it) => it.type === "r")
    .map((it) => ds.roleIndexByName.get(`roles/${it.name}`))
    .filter((i): i is number => i !== undefined);
  const permAnchor = [...state.selection]
    .reverse()
    .find((it) => it.type === "p");
  const permId = permAnchor ? ds.permIdByName.get(permAnchor.name) : undefined;

  const rightPane =
    permId !== undefined ? (
      <ReversePane ds={ds} state={state} permId={permId} />
    ) : selRoleIdxs.length >= 2 ? (
      <ComparePane ds={ds} state={state} roleIndexes={selRoleIdxs} />
    ) : selRoleIdxs.length === 1 ? (
      <DetailPane ds={ds} state={state} roleIndex={selRoleIdxs[0]} />
    ) : (
      <GuidePane state={state} />
    );

  return (
    <div
      className={`flex h-dvh flex-col text-gray-900 dark:text-gray-100 ${dragging ? "select-none" : ""}`}
    >
      <HeaderBar ds={ds} state={state} />
      <div className="flex min-h-0 flex-1">
        {!expanded && (
          <>
            <aside
              style={{ width: sidebarWidth }}
              className="shrink-0 border-r border-gray-200 dark:border-gray-800"
            >
              <RoleList
                ds={ds}
                state={state}
                roleIndexes={filtered}
                totalCount={totalRoleCount}
                onCollapse={() => setExpanded(true)}
              />
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
    </div>
  );
}
