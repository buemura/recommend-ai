import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

export const recommendations = pgTable("recommendations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  genre: text("genre"),
  releaseYear: integer("release_year"),
  rating: real("rating"),
  seasons: integer("seasons"),
  episodes: integer("episodes"),
  artist: text("artist"),
  language: text("language"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  code: text("code").unique().notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("waiting"),
  recommendationId: text("recommendation_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
});

export const tmdbCache = pgTable("tmdb_cache", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  activityType: text("activity_type").notNull(),
  tmdbTitle: text("tmdb_title").notNull(),
  description: text("description").notNull(),
  genre: text("genre"),
  releaseYear: integer("release_year"),
  rating: real("rating"),
  seasons: integer("seasons"),
  episodes: integer("episodes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityType: text("activity_type"),
    filters: text("filters"),
    joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })]
);

export const watchlists = pgTable("watchlists", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const watchlistItems = pgTable("watchlist_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  watchlistId: text("watchlist_id")
    .notNull()
    .references(() => watchlists.id, { onDelete: "cascade" }),
  recommendationId: text("recommendation_id")
    .notNull()
    .references(() => recommendations.id, { onDelete: "cascade" }),
  addedAt: timestamp("added_at", { mode: "date" }).defaultNow().notNull(),
});

// --- Relations ---

export const watchlistsRelations = relations(watchlists, ({ many, one }) => ({
  user: one(users, { fields: [watchlists.userId], references: [users.id] }),
  items: many(watchlistItems),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  watchlist: one(watchlists, {
    fields: [watchlistItems.watchlistId],
    references: [watchlists.id],
  }),
  recommendation: one(recommendations, {
    fields: [watchlistItems.recommendationId],
    references: [recommendations.id],
  }),
}));
