export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          content: Json | null
          conversation_id: number
          created_at: string | null
          id: number
        }
        Insert: {
          content?: Json | null
          conversation_id: number
          created_at?: string | null
          id?: number
        }
        Update: {
          content?: Json | null
          conversation_id?: number
          created_at?: string | null
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: never
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: never
          name?: string
        }
        Relationships: []
      }
      configurations: {
        Row: {
          created_at: string | null
          default_currency: string
          default_gpt_token: string | null
          free_plan_message_limit: number | null
          google_capcha_key: string | null
          id: number
          languages: Json | null
          secret_message: string | null
        }
        Insert: {
          created_at?: string | null
          default_currency?: string
          default_gpt_token?: string | null
          free_plan_message_limit?: number | null
          google_capcha_key?: string | null
          id?: number
          languages?: Json | null
          secret_message?: string | null
        }
        Update: {
          created_at?: string | null
          default_currency?: string
          default_gpt_token?: string | null
          free_plan_message_limit?: number | null
          google_capcha_key?: string | null
          id?: number
          languages?: Json | null
          secret_message?: string | null
        }
        Relationships: []
      }
      contact_form: {
        Row: {
          created_at: string | null
          email: string | null
          fname: string | null
          id: number
          lname: string | null
          message: string | null
          responded: boolean | null
          user_id: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          fname?: string | null
          id?: number
          lname?: string | null
          message?: string | null
          responded?: boolean | null
          user_id?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          fname?: string | null
          id?: number
          lname?: string | null
          message?: string | null
          responded?: boolean | null
          user_id?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          accept_terms_and_conditions: boolean | null
          conversation_memory: Json | null
          created_at: string | null
          current_participants: number | null
          ended_at: string | null
          engagement_metrics: Json | null
          final_report_id: string | null
          flow_config: Json | null
          id: number
          is_saved: boolean
          is_session_ended: boolean | null
          language: string | null
          participant_description: string | null
          participant_engagement_score: number | null
          participants: number | null
          session_duration_minutes: number | null
          session_started: boolean | null
          sessions_id: number | null
          status: Database["public"]["Enums"]["session_status"] | null
          total_messages: number | null
          updated_at: string | null
          user_id: string
          welcome_message_status: string | null
        }
        Insert: {
          accept_terms_and_conditions?: boolean | null
          conversation_memory?: Json | null
          created_at?: string | null
          current_participants?: number | null
          ended_at?: string | null
          engagement_metrics?: Json | null
          final_report_id?: string | null
          flow_config?: Json | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participant_engagement_score?: number | null
          participants?: number | null
          session_duration_minutes?: number | null
          session_started?: boolean | null
          sessions_id?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          total_messages?: number | null
          updated_at?: string | null
          user_id: string
          welcome_message_status?: string | null
        }
        Update: {
          accept_terms_and_conditions?: boolean | null
          conversation_memory?: Json | null
          created_at?: string | null
          current_participants?: number | null
          ended_at?: string | null
          engagement_metrics?: Json | null
          final_report_id?: string | null
          flow_config?: Json | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participant_engagement_score?: number | null
          participants?: number | null
          session_duration_minutes?: number | null
          session_started?: boolean | null
          sessions_id?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          total_messages?: number | null
          updated_at?: string | null
          user_id?: string
          welcome_message_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_final_report_id_fkey"
            columns: ["final_report_id"]
            isOneToOne: false
            referencedRelation: "session_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_sessions_id_fkey"
            columns: ["sessions_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_conversations_sessions"
            columns: ["sessions_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations_config: {
        Row: {
          content: string | null
          created_at: string
          id: number
          order: number | null
          parameters: Json | null
          position: string | null
          role: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: number
          order?: number | null
          parameters?: Json | null
          position?: string | null
          role?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: number
          order?: number | null
          parameters?: Json | null
          position?: string | null
          role?: string | null
        }
        Relationships: []
      }
      facilitators: {
        Row: {
          config_history: Json | null
          created_at: string | null
          description: string | null
          details: string | null
          expertise_level: string | null
          id: number
          is_promoted: boolean | null
          languages: string[] | null
          last_active: string | null
          lock: boolean | null
          order: number | null
          plan_id: number | null
          profile_picture: string | null
          rating: number | null
          specialties: string[] | null
          title: string | null
          total_sessions: number | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          config_history?: Json | null
          created_at?: string | null
          description?: string | null
          details?: string | null
          expertise_level?: string | null
          id?: number
          is_promoted?: boolean | null
          languages?: string[] | null
          last_active?: string | null
          lock?: boolean | null
          order?: number | null
          plan_id?: number | null
          profile_picture?: string | null
          rating?: number | null
          specialties?: string[] | null
          title?: string | null
          total_sessions?: number | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          config_history?: Json | null
          created_at?: string | null
          description?: string | null
          details?: string | null
          expertise_level?: string | null
          id?: number
          is_promoted?: boolean | null
          languages?: string[] | null
          last_active?: string | null
          lock?: boolean | null
          order?: number | null
          plan_id?: number | null
          profile_picture?: string | null
          rating?: number | null
          specialties?: string[] | null
          title?: string | null
          total_sessions?: number | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "facilitators_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "facilitators_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: number
          status: boolean | null
          title: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          status?: boolean | null
          title?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: number
          status?: boolean | null
          title?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          content: string | null
          conversation_id: number | null
          created_at: string | null
          facilitator_knowledge: number | null
          id: number
          material_quality: number | null
          rating: number | null
          session_pace: number | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id?: number | null
          created_at?: string | null
          facilitator_knowledge?: number | null
          id?: never
          material_quality?: number | null
          rating?: number | null
          session_pace?: number | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: number | null
          created_at?: string | null
          facilitator_knowledge?: number | null
          id?: never
          material_quality?: number | null
          rating?: number | null
          session_pace?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json | null
          conversation_id: number | null
          created_at: string | null
          facilitator_id: number | null
          id: number
          name: string | null
          participant_id: number | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: Json | null
          conversation_id?: number | null
          created_at?: string | null
          facilitator_id?: number | null
          id?: number
          name?: string | null
          participant_id?: number | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: Json | null
          conversation_id?: number | null
          created_at?: string | null
          facilitator_id?: number | null
          id?: number
          name?: string | null
          participant_id?: number | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_messages_conversations"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: false
            referencedRelation: "facilitators"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_restrictions: {
        Row: {
          created_at: string | null
          customisable_facilitators: boolean
          customisable_sessions: boolean | null
          data_export: boolean | null
          facilitator_limit: number | null
          id: number
          max_participants: number | null
          plan_id: number | null
          question_limit: number
          saved_sessions: boolean | null
          session_limit: number | null
          session_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          customisable_facilitators: boolean
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          facilitator_limit?: number | null
          id?: number
          max_participants?: number | null
          plan_id?: number | null
          question_limit?: number
          saved_sessions?: boolean | null
          session_limit?: number | null
          session_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          customisable_facilitators?: boolean
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          facilitator_limit?: number | null
          id?: number
          max_participants?: number | null
          plan_id?: number | null
          question_limit?: number
          saved_sessions?: boolean | null
          session_limit?: number | null
          session_reports?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_restrictions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_restrictions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          currency: string | null
          id: number
          is_popular: boolean | null
          plan_type: string | null
          price: number | null
          stripe_plan_id: string | null
          title: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: number
          is_popular?: boolean | null
          plan_type?: string | null
          price?: number | null
          stripe_plan_id?: string | null
          title?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: number
          is_popular?: boolean | null
          plan_type?: string | null
          price?: number | null
          stripe_plan_id?: string | null
          title?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          current_plan_id: number | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_plan_id?: number | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_plan_id?: number | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plan_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      session_events: {
        Row: {
          conversation_id: number
          created_at: string
          data: Json | null
          event_type: string
          id: number
        }
        Insert: {
          conversation_id: number
          created_at?: string
          data?: Json | null
          event_type: string
          id?: number
        }
        Update: {
          conversation_id?: number
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_events_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_participants: {
        Row: {
          avatar_seed: string | null
          conversation_id: number
          created_at: string | null
          id: number
          is_anonymous: boolean | null
          is_host: boolean
          name: string
          participant_id: number
        }
        Insert: {
          avatar_seed?: string | null
          conversation_id: number
          created_at?: string | null
          id?: number
          is_anonymous?: boolean | null
          is_host?: boolean
          name: string
          participant_id: number
        }
        Update: {
          avatar_seed?: string | null
          conversation_id?: number
          created_at?: string | null
          id?: number
          is_anonymous?: boolean | null
          is_host?: boolean
          name?: string
          participant_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reports: {
        Row: {
          conversation_id: number
          file_size: number | null
          file_url: string | null
          generated_at: string
          generated_by: string | null
          id: string
          metadata: Json | null
          report_content: string
          report_type: string
        }
        Insert: {
          conversation_id: number
          file_size?: number | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_content: string
          report_type?: string
        }
        Update: {
          conversation_id?: number
          file_size?: number | null
          file_url?: string | null
          generated_at?: string
          generated_by?: string | null
          id?: string
          metadata?: Json | null
          report_content?: string
          report_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          category_id: number | null
          created_at: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          facilitator: number | null
          gpt_version: string | null
          icon_type: string | null
          id: number
          learning_outcomes: string[] | null
          lock: boolean | null
          max_tokens: string | null
          objective: string | null
          output_format: string | null
          prerequisites: string[] | null
          prompt: string | null
          randomness: number | null
          scope: string | null
          session_type: Database["public"]["Enums"]["session_type"] | null
          skill_level: string | null
          status: boolean | null
          tags: string[] | null
          title: string | null
          welcome_message: string | null
        }
        Insert: {
          category_id?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          facilitator?: number | null
          gpt_version?: string | null
          icon_type?: string | null
          id?: number
          learning_outcomes?: string[] | null
          lock?: boolean | null
          max_tokens?: string | null
          objective?: string | null
          output_format?: string | null
          prerequisites?: string[] | null
          prompt?: string | null
          randomness?: number | null
          scope?: string | null
          session_type?: Database["public"]["Enums"]["session_type"] | null
          skill_level?: string | null
          status?: boolean | null
          tags?: string[] | null
          title?: string | null
          welcome_message?: string | null
        }
        Update: {
          category_id?: number | null
          created_at?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          facilitator?: number | null
          gpt_version?: string | null
          icon_type?: string | null
          id?: number
          learning_outcomes?: string[] | null
          lock?: boolean | null
          max_tokens?: string | null
          objective?: string | null
          output_format?: string | null
          prerequisites?: string[] | null
          prompt?: string | null
          randomness?: number | null
          scope?: string | null
          session_type?: Database["public"]["Enums"]["session_type"] | null
          skill_level?: string | null
          status?: boolean | null
          tags?: string[] | null
          title?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_facilitator_fkey"
            columns: ["facilitator"]
            isOneToOne: false
            referencedRelation: "facilitators"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_history: {
        Row: {
          completion_status: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          facilitator_id: number | null
          feedback_score: number | null
          feedback_text: string | null
          id: number
          language: string | null
          participant_count: number | null
          session_id: number | null
          started_at: string | null
          success_rate: number | null
        }
        Insert: {
          completion_status?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          facilitator_id?: number | null
          feedback_score?: number | null
          feedback_text?: string | null
          id?: never
          language?: string | null
          participant_count?: number | null
          session_id?: number | null
          started_at?: string | null
          success_rate?: number | null
        }
        Update: {
          completion_status?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          facilitator_id?: number | null
          feedback_score?: number | null
          feedback_text?: string | null
          id?: never
          language?: string | null
          participant_count?: number | null
          session_id?: number | null
          started_at?: string | null
          success_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_history_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: false
            referencedRelation: "facilitators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_history_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      plan_features: {
        Row: {
          created_at: string | null
          currency: string | null
          customisable_facilitators: boolean | null
          customisable_sessions: boolean | null
          data_export: boolean | null
          id: number | null
          is_popular: boolean | null
          max_participants: number | null
          no_of_facilitator: number | null
          no_of_sessions: number | null
          number_of_questions_per_session: number | null
          plan_type: string | null
          price: number | null
          saved_sessions: boolean | null
          session_reports: boolean | null
          stripe_plan_id: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_session_analytics: {
        Args: { conv_id: number }
        Returns: undefined
      }
      get_user_participant_id: {
        Args: { conv_id: number }
        Returns: number
      }
      is_participant_or_owner: {
        Args: { conversation_id: number }
        Returns: boolean
      }
      is_session_host: {
        Args: { conversation_id: number }
        Returns: boolean
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      validate_participant_capacity: {
        Args: { conv_id: number }
        Returns: boolean
      }
    }
    Enums: {
      session_status: "draft" | "active" | "completed" | "archived"
      session_type:
        | "workshop"
        | "training"
        | "consultation"
        | "coaching"
        | "team_building"
      user_role: "free" | "basic" | "premium" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      session_status: ["draft", "active", "completed", "archived"],
      session_type: [
        "workshop",
        "training",
        "consultation",
        "coaching",
        "team_building",
      ],
      user_role: ["free", "basic", "premium", "admin"],
    },
  },
} as const
