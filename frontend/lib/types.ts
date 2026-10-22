export type Story = {
  id: string;
  headline: string;
  summary: string;
  category: string;
  source: string;
  url: string;
  published_at: string | null;
  summary_kind?: "source_excerpt" | "ai_summary";
  image?: string;
  image_caption?: string;
  video?: string;
  video_caption?: string;
};
export type Edition = {
  id: string;
  date: string;
  title: string;
  sample?: boolean;
  articles: Story[];
};
export type Preferences = {
  topics: string[];
  length: string;
  tone: string;
  language: string;
  theme: string;
  time: string;
  timezone: string;
  email: boolean;
  delivery_format: "link" | "pdf" | "both";
  days: number[];
};
export type Source = {
  id: string;
  name: string;
  kind: string;
  url: string;
  enabled: boolean;
  status?: string;
};
export const defaults: Preferences = {
  topics: ["Technology", "Science", "Open source"],
  length: "Daily Edition",
  tone: "Balanced",
  language: "English",
  theme: "Classic",
  time: "07:00",
  timezone: "Asia/Kolkata",
  email: false,
  delivery_format: "link",
  days: [0, 1, 2, 3, 4, 5, 6],
};
