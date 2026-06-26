import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  date,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* BetterAuth tables                                                   */
/* These match the schema BetterAuth expects (model names: user,       */
/* session, account, verification). Do not rename columns.             */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

/* ------------------------------------------------------------------ */
/* Application tables                                                  */
/* ------------------------------------------------------------------ */

/**
 * Template Block, one entry in the fixed daily timeline. Self-describing:
 * kind = 'work' carries its own free-text label and a duration; kind = 'break'
 * carries a duration and an optional label. A Block may be excluded from
 * specific weekdays (ADR 0003).
 */
export const templateBlocks = pgTable(
  "template_blocks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["work", "break"] }).notNull(),
    // The Block's label. Required in practice for work blocks; optional for breaks.
    label: text("label"),
    durationHours: doublePrecision("duration_hours").notNull().default(0),
    // JS getDay() weekday numbers this Block is skipped on (0 = Sunday .. 6 = Saturday).
    excludedWeekdays: integer("excluded_weekdays").array().notNull().default([]),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("template_blocks_user_id_idx").on(table.userId)],
);

/**
 * Day Record, a single calendar day's instance. `localDate` is the date after
 * applying the user's day-start hour, computed on the client in their timezone.
 */
export const dayRecords = pgTable(
  "day_records",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    localDate: date("local_date").notNull(),
    // True once the day has been seeded from a non-empty Template. Lets a day
    // created before any Template existed fill in on a later visit, while a day
    // the user intentionally emptied (already populated) stays empty.
    populated: boolean("populated").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("day_records_user_date_idx").on(table.userId, table.localDate),
  ],
);

/**
 * Day Block, a snapshot block belonging to one Day Record. Labels/durations are
 * frozen at creation so later Template edits never rewrite history. `done` is the
 * checkbox; ad-hoc blocks are added directly to a day (and may be typeless).
 */
export const dayBlocks = pgTable(
  "day_blocks",
  {
    id: text("id").primaryKey(),
    dayRecordId: text("day_record_id")
      .notNull()
      .references(() => dayRecords.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["work", "break"] }).notNull(),
    label: text("label").notNull(),
    durationHours: doublePrecision("duration_hours").notNull().default(0),
    done: boolean("done").notNull().default(false),
    isAdhoc: boolean("is_adhoc").notNull().default(false),
    // Timer (ADR 0004). `trackedSeconds` is the accumulated wall-clock time on this
    // block; when `runningSince` is set the timer is live and current elapsed is
    // trackedSeconds + (now - runningSince). At most one block per day record runs
    // at a time. Tracked time is independent of `done`.
    trackedSeconds: integer("tracked_seconds").notNull().default(0),
    runningSince: timestamp("running_since"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("day_blocks_day_record_id_idx").on(table.dayRecordId)],
);

/**
 * Per-user settings: UI language and the day-start rollover hour.
 */
export const userSettings = pgTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  language: text("language", { enum: ["en", "ar"] }).notNull().default("en"),
  // 0..23, hour at which a new day begins. Default 0 (midnight).
  dayStartHour: integer("day_start_hour").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export type TemplateBlock = typeof templateBlocks.$inferSelect;
export type DayRecord = typeof dayRecords.$inferSelect;
export type DayBlock = typeof dayBlocks.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
