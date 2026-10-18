export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type LanguageCode = "en" | "de";

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          id: string;
          display_name: string | null;
          preferred_lang_code: LanguageCode;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          preferred_lang_code?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          preferred_lang_code?: LanguageCode;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercise_translations: {
        Row: {
          exercise_id: string;
          lang_code: LanguageCode;
          name: string;
          created_at: string;
        };
        Insert: {
          exercise_id: string;
          lang_code: LanguageCode;
          name: string;
          created_at?: string;
        };
        Update: {
          exercise_id?: string;
          lang_code?: LanguageCode;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_bodyweight_log: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          bodyweight_kg: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_on: string;
          bodyweight_kg: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          logged_on?: string;
          bodyweight_kg?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_hidden_exercises: {
        Row: {
          user_id: string;
          exercise_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          exercise_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          exercise_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      user_profile_metrics: {
        Row: {
          user_id: string;
          bodyweight_kg: number | null;
          height_cm: number | null;
          birth_year: number | null;
          sex: "female" | "male" | null;
          date_of_birth: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          bodyweight_kg?: number | null;
          height_cm?: number | null;
          birth_year?: number | null;
          sex?: "female" | "male" | null;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          bodyweight_kg?: number | null;
          height_cm?: number | null;
          birth_year?: number | null;
          sex?: "female" | "male" | null;
          date_of_birth?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      strength_milestones: {
        Row: {
          id: string;
          user_id: string;
          exercise_id: string;
          milestone_type: "absolute" | "bodyweight_multiple";
          target_weight_kg: number | null;
          bodyweight_multiple: number | null;
          min_reps: number;
          due_on: string | null;
          note: string | null;
          achieved_at: string | null;
          achieved_bodyweight_kg: number | null;
          achieved_threshold_kg: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          exercise_id: string;
          milestone_type: "absolute" | "bodyweight_multiple";
          target_weight_kg?: number | null;
          bodyweight_multiple?: number | null;
          min_reps?: number;
          due_on?: string | null;
          note?: string | null;
          achieved_at?: string | null;
          achieved_bodyweight_kg?: number | null;
          achieved_threshold_kg?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          exercise_id?: string;
          milestone_type?: "absolute" | "bodyweight_multiple";
          target_weight_kg?: number | null;
          bodyweight_multiple?: number | null;
          min_reps?: number;
          due_on?: string | null;
          note?: string | null;
          achieved_at?: string | null;
          achieved_bodyweight_kg?: number | null;
          achieved_threshold_kg?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_sessions: {
        Row: {
          id: string;
          user_id: string;
          performed_on: string;
          notes: string | null;
          source_template_id: string | null;
          plan_id: string | null;
          plan_day_id: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          performed_on?: string;
          notes?: string | null;
          source_template_id?: string | null;
          plan_id?: string | null;
          plan_day_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          performed_on?: string;
          notes?: string | null;
          source_template_id?: string | null;
          plan_id?: string | null;
          plan_day_id?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_sessions_source_template_id_fkey";
            columns: ["source_template_id"];
            isOneToOne: false;
            referencedRelation: "workout_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_sessions_plan_day_id_fkey";
            columns: ["plan_day_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_days";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_session_exercises: {
        Row: {
          id: string;
          session_id: string;
          exercise_id: string;
          position: number;
          base_weight_kg: number | null;
          target_sets: number | null;
          target_reps: number | null;
          target_weight_kg: number | null;
          notes: string | null;
          not_done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          exercise_id: string;
          position: number;
          base_weight_kg?: number | null;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          notes?: string | null;
          not_done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          exercise_id?: string;
          position?: number;
          base_weight_kg?: number | null;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          notes?: string | null;
          not_done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          session_exercise_id: string;
          set_number: number;
          reps: number;
          weight_kg: number | null;
          is_warmup: boolean;
          performed_at: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_exercise_id: string;
          set_number: number;
          reps: number;
          weight_kg?: number | null;
          is_warmup?: boolean;
          performed_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_exercise_id?: string;
          set_number?: number;
          reps?: number;
          weight_kg?: number | null;
          is_warmup?: boolean;
          performed_at?: string;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_api_tokens: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          token_prefix: string;
          token_hash: string;
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          token_prefix: string;
          token_hash: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          token_prefix?: string;
          token_hash?: string;
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Relationships: [];
      };
      user_exercise_defaults: {
        Row: {
          user_id: string;
          exercise_id: string;
          default_base_weight_kg: number | null;
          default_target_sets: number | null;
          default_target_reps: number | null;
          default_target_weight_kg: number | null;
          suggest_warmups: boolean;
          suggest_target: boolean;
          max_suggested_warmup_sets: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          exercise_id: string;
          default_base_weight_kg?: number | null;
          default_target_sets?: number | null;
          default_target_reps?: number | null;
          default_target_weight_kg?: number | null;
          suggest_warmups?: boolean;
          suggest_target?: boolean;
          max_suggested_warmup_sets?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          exercise_id?: string;
          default_base_weight_kg?: number | null;
          default_target_sets?: number | null;
          default_target_reps?: number | null;
          default_target_weight_kg?: number | null;
          suggest_warmups?: boolean;
          suggest_target?: boolean;
          max_suggested_warmup_sets?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_templates: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_template_exercises: {
        Row: {
          id: string;
          template_id: string;
          exercise_id: string;
          position: number;
          target_sets: number | null;
          target_reps: number | null;
          target_weight_kg: number | null;
          base_weight_kg: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          exercise_id: string;
          position: number;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          base_weight_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          exercise_id?: string;
          position?: number;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          base_weight_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_plan_days: {
        Row: {
          id: string;
          plan_id: string;
          name: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          name: string;
          position: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_id?: string;
          name?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plan_days_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "workout_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      workout_plan_day_exercises: {
        Row: {
          id: string;
          plan_day_id: string;
          exercise_id: string;
          position: number;
          target_sets: number | null;
          target_reps: number | null;
          target_weight_kg: number | null;
          base_weight_kg: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_day_id: string;
          exercise_id: string;
          position: number;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          base_weight_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          plan_day_id?: string;
          exercise_id?: string;
          position?: number;
          target_sets?: number | null;
          target_reps?: number | null;
          target_weight_kg?: number | null;
          base_weight_kg?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workout_plan_day_exercises_plan_day_id_fkey";
            columns: ["plan_day_id"];
            isOneToOne: false;
            referencedRelation: "workout_plan_days";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workout_plan_day_exercises_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      home_session_summaries: {
        Row: {
          id: string;
          user_id: string;
          performed_on: string;
          notes: string | null;
          created_at: string;
          started_at: string | null;
          completed_at: string | null;
          set_count: number;
          exercise_badges: Array<{
            slug: string;
            has_logged_set: boolean;
            not_done: boolean;
          }>;
        };
        Relationships: [];
      };
    };
    Functions: {
      exercise_past_session_counts: {
        Args: {
          p_through: string;
        };
        Returns: Array<{
          exercise_id: string;
          session_count: number;
        }>;
      };
      instantiate_workout_template: {
        Args: {
          p_notes?: string | null;
          p_performed_on: string;
          p_template_id: string;
        };
        Returns: string;
      };
      save_workout_plan: {
        Args: {
          p_plan_id: string | null;
          p_name: string;
          p_notes: string | null;
          p_is_active: boolean;
          p_days: Json;
        };
        Returns: string;
      };
    };
    Enums: {
      language_code: LanguageCode;
      profile_sex: "female" | "male";
      strength_milestone_type: "absolute" | "bodyweight_multiple";
    };
    CompositeTypes: Record<string, never>;
  };
};
