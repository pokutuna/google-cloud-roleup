import { Languages, Settings } from "lucide-react";
import type { SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import type { Dataset } from "../lib/data";
import { useLang, useT } from "../lib/i18n";
import { LANGS } from "../lib/i18n-data";
import { usePinnedRoles, usePinnedServices } from "../lib/pinned";
import type { ExplorerState } from "../lib/url-state";
import { Omnibox } from "./Omnibox";
import { EntityChip } from "./primitives";

/**
 * Legend line doubling as a tutorial (§4.1-6): each chip is clickable and
 * writes its qualifier into the search box.
 */
function Legend({ state }: { state: ExplorerState }) {
  const t = useT();
  const append = (qualifier: string) =>
    state.setQ(state.q ? `${state.q.trimEnd()} ${qualifier}` : qualifier);
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      {t("legend.lead")}
      <EntityChip
        kind="s"
        label={t("legend.service")}
        onClick={() => append("s:")}
      />
      {t("legend.afterService")}
      <EntityChip
        kind="r"
        label={t("legend.role")}
        onClick={() => append("r:")}
      />
      {t("legend.afterRole")}
      <EntityChip
        kind="p"
        label={t("legend.permission")}
        onClick={() => append("p:")}
      />
      {t("legend.tail")}
    </p>
  );
}

function SelectionTray({ state }: { state: ExplorerState }) {
  const t = useT();
  if (state.selection.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {state.selection.map((item) => (
        <EntityChip
          key={`${item.type}:${item.name}`}
          kind={item.type}
          label={item.name}
          onRemove={() => state.remove(item)}
        />
      ))}
      {state.selection.length > 1 && (
        <button
          type="button"
          onClick={state.clear}
          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
        >
          {t("header.deselectAll")}
        </button>
      )}
    </div>
  );
}

function SettingsMenu() {
  const t = useT();
  const { reset: resetPinnedServices, isDefault: servicesIsDefault } =
    usePinnedServices();
  const { reset: resetPinnedRoles, isDefault: rolesIsDefault } =
    usePinnedRoles();
  const isDefault = servicesIsDefault && rolesIsDefault;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("header.settings")}
        aria-label={t("header.settings")}
        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <Settings size={16} />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1 w-56 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
          <button
            type="button"
            disabled={isDefault}
            onClick={() => {
              resetPinnedServices();
              resetPinnedRoles();
              setOpen(false);
            }}
            className={`block w-full px-3 py-1.5 text-left ${
              isDefault
                ? "cursor-default text-gray-400 dark:text-gray-600"
                : "cursor-pointer text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {t("header.resetPinnedServices")}
          </button>
        </div>
      )}
    </div>
  );
}

function LangMenu() {
  const t = useT();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const current = LANGS.find((l) => l.code === lang);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("lang.switch")}
        aria-label={t("lang.switch")}
        className="flex items-center gap-1 rounded p-1 text-xs text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-gray-300"
      >
        <Languages size={14} />
        {current?.label}
      </button>
      {open && (
        <div className="absolute top-full right-0 z-30 mt-1 w-32 rounded border border-gray-200 bg-white py-1 text-sm shadow-lg dark:border-gray-700 dark:bg-gray-900">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={`block w-full px-3 py-1.5 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                l.code === lang
                  ? "font-medium text-gray-900 dark:text-gray-100"
                  : "text-gray-700 dark:text-gray-200"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** lucide-react's `Github` icon is deprecated; inline the GitHub mark instead. */
function GithubIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

export function HeaderBar({
  ds,
  state,
}: {
  ds: Dataset;
  state: ExplorerState;
}) {
  const t = useT();
  return (
    <header className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="flex items-center gap-3">
        <h1 className="shrink-0 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Google Cloud RoleUp
        </h1>
        <span className="hidden shrink-0 text-[10px] text-gray-400 md:ml-auto md:inline">
          {t("header.dataStats", {
            date: ds.generatedAt,
            roles: ds.roles.length,
            perms: ds.permissions.length,
          })}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
          <LangMenu />
          <SettingsMenu />
          <a
            href="https://github.com/pokutuna/google-cloud-roleup"
            target="_blank"
            rel="noreferrer"
            title={t("header.repository")}
            aria-label={t("header.repository")}
            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <GithubIcon />
          </a>
        </div>
      </div>
      <Legend state={state} />
      <Omnibox ds={ds} state={state} />
      <SelectionTray state={state} />
    </header>
  );
}
