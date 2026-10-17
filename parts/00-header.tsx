// GeminiForge V20 Workbench — single-file build. Dark only. Libraries: react, zustand, lucide-react.
import { flushSync } from "react-dom";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import {
  PanelLeft, Plus, BookOpen, Layers, Cpu, Network, Box, FileText, ShieldCheck, Sparkles,
  ArrowUp, Copy, Check, X, Code2, ChevronRight, ChevronDown, Zap, RotateCcw, FolderKanban, Lock,
  Search, List, Bookmark, Settings, Keyboard, Info, Database, SlidersHorizontal, FlaskConical, MessageSquare, ListChecks, Download, Upload
} from "lucide-react";

// #region 1. TYPES
export type ChapterId = "overview" | "planes" | "governor" | "swarm" | "packs" | "prompts" | "patches";
export type PaneKind = "crate" | "pack" | "prompt" | "confirm" | "patch" | "spike" | "os" | "lab";
export interface PaneRef { kind: PaneKind; id: string }
export type View =
  | { kind: "home" }
  | { kind: "chapter"; id: ChapterId; sec?: string }
  | { kind: "thread"; id: string }
  | { kind: "library" }
  | { kind: "tracker" }
  | { kind: "history" }
  | { kind: "audit" };
export type MotionMode = "full" | "reduced" | "system";
export type Depth = "brief" | "standard" | "detailed";
export type PromptStatus = "todo" | "running" | "done";
export type SpikeStatus = "todo" | "running" | "pass" | "fail";
export type AuditStatus = "open" | "fix" | "keep" | "drop";

export interface CrateEntry { name: string; layer: string; plane: string; plainSummary: string; whyItMatters: string; deps: string; badge: string; code: string }
export interface AgentRosterItem { id: string; role: string; reportsTo: string; tier: string; plainRoleExplanation: string; budgetMicros: number; spentMicros: number; paused: boolean }
export interface SwarmTaskItem { taskId: string; ancestry: string; title: string; plainExplanation: string; assignee: string; status: "PENDING" | "RUNNING" | "IN_REVIEW" | "COMPLETED"; checkedOutRunId: string | null; confidence: number; planHash: string }
export interface ForgeHubPack { id: string; cat: "CAT1" | "CAT2" | "CAT3" | "CAT4" | "CAT5"; catLabel: string; name: string; size: string; minTier: "E" | "C" | "B" | "A" | "S"; plainPurpose: string; tools: string }
export interface DeepPromptEntry { id: string; files: string; title: string; plainGoal: string; whyNeeded: string; fullPrompt: string }
export interface Confirmation { id: string; title: string; plainWhy: string }
export interface SpecPatch { id: string; target: string; summary: string; code: string }
export interface Spike { id: string; target: string; candA: string; candB: string; gate: string }
export interface OsRow { dim: string; mint_x11: string; mint_wayland: string; ubuntu_wayland: string; win_x64: string; macos: string }

export interface RowItem { title: string; badge?: string; body: string[] }
export interface CardItem { tag: string; title: string; text: string }
export type Block =
  | { t: "badge"; text: string }
  | { t: "h1"; text: string }
  | { t: "h2"; id: string; text: string }
  | { t: "p"; text: string }
  | { t: "rows"; items: RowItem[] }
  | { t: "cards"; items: CardItem[] }
  | { t: "chips"; items: { label: string; ref: PaneRef }[] }
  | { t: "chart"; id: "tier" | "pss" }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "crates" } | { t: "packs" } | { t: "prompts" } | { t: "confirms" } | { t: "patches" } | { t: "tasks" } | { t: "roster" };
export type AnsBlock =
  | { t: "p"; text: string }
  | { t: "items"; items: { key: string; title: string; sub: string }[] }
  | { t: "kv"; rows: [string, string][] }
  | { t: "code"; code: string; lang: "rust" | "sql" | "json" | "text" };
export interface Answer { blocks: AnsBlock[]; sources: string[]; ctx?: string; status?: "exact" | "closest" | "none"; understood?: string }
export interface ChapterMeta { id: ChapterId; num: string; title: string; subtitle: string; Icon: React.ElementType }
export interface Section { id: string; num: string; title: string }
// #endregion
