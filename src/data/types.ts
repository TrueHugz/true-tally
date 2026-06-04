export type ActivityType = "Stock Take" | "Stock Top Up";
export type TimeWindow = "day" | "month" | "toDate";

export interface Institution {
  institution: string;
  remarks: string;
}
export interface Branch {
  institution: string;
  branch: string;
  remarks: string;
}
export interface Product {
  description: string;
  sku: string;
  type: string;
}
export interface LogEntry {
  entryId: string;
  activityDate: string; // YYYY-MM-DD
  institution: string;
  branch: string;
  activityType: ActivityType;
  product: string; // description
  sku: string;
  quantity: number;
  loggedAt: string; // ISO timestamp
}
export type PendingEntry = LogEntry;

export interface ProductTotal {
  product: string;
  sku: string;
  total: number;
}
