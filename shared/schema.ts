import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const proxies = pgTable("proxies", {
  id: serial("id").primaryKey(),
  ip: varchar("ip", { length: 45 }).notNull(),
  port: integer("port").notNull(),
  username: text("username"),
  password: text("password"),
  type: varchar("type", { length: 10 }).notNull(), // 'http' or 'socks5'
  status: varchar("status", { length: 20 }).notNull().default('available'), // 'available', 'in_use', 'cooling_down'
  lastUsed: timestamp("last_used"),
  failCount: integer("fail_count").notNull().default(0),
  responseTime: integer("response_time"), // in milliseconds
});

export const proxySettings = pgTable("proxy_settings", {
  id: serial("id").primaryKey(),
  rotationInterval: integer("rotation_interval").notNull().default(300), // seconds
  maxConcurrent: integer("max_concurrent").notNull().default(10),
  cooldownPeriod: integer("cooldown_period").notNull().default(600), // seconds
  maxFailCount: integer("max_fail_count").notNull().default(3),
  enabled: boolean("enabled").notNull().default(true),
});

export const workflows = pgTable("workflows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  selectors: jsonb("selectors").$type<{
    type: "css" | "xpath";
    value: string;
    label: string;
  }[]>().notNull(),
  requiresJavaScript: boolean("requires_javascript").notNull().default(false),
  useProxy: boolean("use_proxy").notNull().default(false),
  lastSaved: text("last_saved").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProxySchema = createInsertSchema(proxies).omit({
  id: true,
  status: true,
  lastUsed: true,
  failCount: true,
  responseTime: true,
});

export const insertProxySettingsSchema = createInsertSchema(proxySettings).omit({
  id: true,
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  userId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Proxy = typeof proxies.$inferSelect;
export type InsertProxy = z.infer<typeof insertProxySchema>;
export type ProxySettings = typeof proxySettings.$inferSelect;
export type InsertProxySettings = z.infer<typeof insertProxySettingsSchema>;

// Helper function to parse proxy strings
export function parseProxyString(proxyStr: string): InsertProxy {
  const [ip, port, username, password] = proxyStr.split(':');
  return {
    ip,
    port: parseInt(port),
    username,
    password,
    type: 'http', // default type, can be changed later
  };
}