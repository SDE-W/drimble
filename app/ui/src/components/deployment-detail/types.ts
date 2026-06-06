export type DetailTab = "overview" | "logs" | "details";

export const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "logs", label: "Build Logs" },
  { id: "details", label: "Details" },
];