export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          created_at: string | null
          ended_at: string | null
          id: number
          is_saved: boolean
          is_session_ended: boolean | null
          language: string | null
          participant_description: string | null
          participants: number | null
          sessions_id: number | null
          status: Database["public"]["Enums"]["session_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accept_terms_and_conditions?: boolean | null
          created_at?: string | null
          ended_at?: string | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participants?: number | null
          sessions_id?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accept_terms_and_conditions?: boolean | null
          created_at?: string | null
          ended_at?: string | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participants?: number | null
          sessions_id?: number | null
          status?: Database["public"]["Enums"]["session_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
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
      [_ in never]: never
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

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
