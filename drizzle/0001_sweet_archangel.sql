CREATE TABLE "training_job" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"job_id" text NOT NULL,
	"r2_key" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_job" ADD CONSTRAINT "training_job_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "training_job_userId_idx" ON "training_job" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_job_userId_jobId_idx" ON "training_job" USING btree ("user_id","job_id");