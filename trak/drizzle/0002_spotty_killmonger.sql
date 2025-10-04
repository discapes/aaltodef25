ALTER TABLE "resourse_group_categories" RENAME TO "resource_group_categories";--> statement-breakpoint
ALTER TABLE "resourse_group_subgroups" RENAME TO "resource_group_subgroups";--> statement-breakpoint
ALTER TABLE "resourse_groups" RENAME TO "resource_groups";--> statement-breakpoint
ALTER TABLE "resource_group_categories" DROP CONSTRAINT "resourse_group_categories_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_group_categories" DROP CONSTRAINT "resourse_group_categories_resource_group_id_resourse_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_group_subgroups" DROP CONSTRAINT "resourse_group_subgroups_parent_group_id_resourse_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_group_subgroups" DROP CONSTRAINT "resourse_group_subgroups_sub_group_id_resourse_groups_id_fk";
--> statement-breakpoint
ALTER TABLE "resource_group_categories" ADD CONSTRAINT "resource_group_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_group_categories" ADD CONSTRAINT "resource_group_categories_resource_group_id_resource_groups_id_fk" FOREIGN KEY ("resource_group_id") REFERENCES "public"."resource_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_group_subgroups" ADD CONSTRAINT "resource_group_subgroups_parent_group_id_resource_groups_id_fk" FOREIGN KEY ("parent_group_id") REFERENCES "public"."resource_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_group_subgroups" ADD CONSTRAINT "resource_group_subgroups_sub_group_id_resource_groups_id_fk" FOREIGN KEY ("sub_group_id") REFERENCES "public"."resource_groups"("id") ON DELETE no action ON UPDATE no action;