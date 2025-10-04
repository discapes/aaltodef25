CREATE TABLE "resourse_group_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"resource_group_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resourse_group_subgroups" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_group_id" integer NOT NULL,
	"sub_group_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resourse_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "resourse_group_categories" ADD CONSTRAINT "resourse_group_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resourse_group_categories" ADD CONSTRAINT "resourse_group_categories_resource_group_id_resourse_groups_id_fk" FOREIGN KEY ("resource_group_id") REFERENCES "public"."resourse_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resourse_group_subgroups" ADD CONSTRAINT "resourse_group_subgroups_parent_group_id_resourse_groups_id_fk" FOREIGN KEY ("parent_group_id") REFERENCES "public"."resourse_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resourse_group_subgroups" ADD CONSTRAINT "resourse_group_subgroups_sub_group_id_resourse_groups_id_fk" FOREIGN KEY ("sub_group_id") REFERENCES "public"."resourse_groups"("id") ON DELETE no action ON UPDATE no action;