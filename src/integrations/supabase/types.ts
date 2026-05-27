/**
 * types
 *
 * Integration for the AIfacilitator application.
 */
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
      admin_notifications: {
        Row: {
          id: number
          conversation_id: number
          content: Json | null
          created_at: string | null
        }
        Insert: {
          id?: number
          conversation_id: number
          content?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          conversation_id?: number
          content?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      admin_profiles_view: {
        Row: {
          id: string | null
          email: string | null
          role: string | null
          plan_id: number | null
          created_at: string | null
          updated_at: string | null
          banned: boolean | null
        }
        Insert: {
          id?: string | null
          email?: string | null
          role?: string | null
          plan_id?: number | null
          created_at?: string | null
          updated_at?: string | null
          banned?: boolean | null
        }
        Update: {
          id?: string | null
          email?: string | null
          role?: string | null
          plan_id?: number | null
          created_at?: string | null
          updated_at?: string | null
          banned?: boolean | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: number
          name: string
          description: string | null
          icon: string | null
          created_at: string | null
        }
        Insert: {
          id: number
          name: string
          description?: string | null
          icon?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          icon?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      configurations: {
        Row: {
          id: number
          default_gpt_token: string | null
          created_at: string | null
          languages: Json | null
          default_currency: string
          google_capcha_key: string | null
          secret_message: string | null
          free_plan_message_limit: number | null
        }
        Insert: {
          id: number
          default_gpt_token?: string | null
          created_at?: string | null
          languages?: Json | null
          default_currency?: string
          google_capcha_key?: string | null
          secret_message?: string | null
          free_plan_message_limit?: number | null
        }
        Update: {
          id?: number
          default_gpt_token?: string | null
          created_at?: string | null
          languages?: Json | null
          default_currency?: string
          google_capcha_key?: string | null
          secret_message?: string | null
          free_plan_message_limit?: number | null
        }
        Relationships: []
      }
      contact_form: {
        Row: {
          id: number
          fname: string | null
          lname: string | null
          email: string | null
          message: string | null
          user_id: number | null
          responded: boolean | null
          created_at: string | null
        }
        Insert: {
          id: number
          fname?: string | null
          lname?: string | null
          email?: string | null
          message?: string | null
          user_id?: number | null
          responded?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: number
          fname?: string | null
          lname?: string | null
          email?: string | null
          message?: string | null
          user_id?: number | null
          responded?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          id: number
          user_id: string
          created_at: string | null
          participants: number | null
          participant_description: string | null
          language: string | null
          sessions_id: number | null
          is_saved: boolean
          is_session_ended: boolean | null
          accept_terms_and_conditions: boolean | null
          status: string | null
          updated_at: string | null
          ended_at: string | null
          current_participants: number | null
          session_started: boolean | null
          total_messages: number | null
          participant_engagement_score: number | null
          session_duration_minutes: number | null
          final_report_id: string | null
          flow_config: Json | null
          engagement_metrics: Json | null
          conversation_memory: Json | null
          welcome_message_status: string | null
          join_token: string | null
        }
        Insert: {
          id: number
          user_id: string
          created_at?: string | null
          participants?: number | null
          participant_description?: string | null
          language?: string | null
          sessions_id?: number | null
          is_saved?: boolean
          is_session_ended?: boolean | null
          accept_terms_and_conditions?: boolean | null
          status?: string | null
          updated_at?: string | null
          ended_at?: string | null
          current_participants?: number | null
          session_started?: boolean | null
          total_messages?: number | null
          participant_engagement_score?: number | null
          session_duration_minutes?: number | null
          final_report_id?: string | null
          flow_config?: Json | null
          engagement_metrics?: Json | null
          conversation_memory?: Json | null
          welcome_message_status?: string | null
        }
        Update: {
          id?: number
          user_id?: string
          created_at?: string | null
          participants?: number | null
          participant_description?: string | null
          language?: string | null
          sessions_id?: number | null
          is_saved?: boolean
          is_session_ended?: boolean | null
          accept_terms_and_conditions?: boolean | null
          status?: string | null
          updated_at?: string | null
          ended_at?: string | null
          current_participants?: number | null
          session_started?: boolean | null
          total_messages?: number | null
          participant_engagement_score?: number | null
          session_duration_minutes?: number | null
          final_report_id?: string | null
          flow_config?: Json | null
          engagement_metrics?: Json | null
          conversation_memory?: Json | null
          welcome_message_status?: string | null
        }
        Relationships: []
      }
      conversations_config: {
        Row: {
          id: number
          role: string | null
          content: string | null
          order: number | null
          position: string | null
          created_at: string
          parameters: Json | null
        }
        Insert: {
          id: number
          role?: string | null
          content?: string | null
          order?: number | null
          position?: string | null
          created_at?: string
          parameters?: Json | null
        }
        Update: {
          id?: number
          role?: string | null
          content?: string | null
          order?: number | null
          position?: string | null
          created_at?: string
          parameters?: Json | null
        }
        Relationships: []
      }
      facilitator_persona_configs: {
        Row: {
          id: number
          facilitator_id: number
          display_name: string | null
          pronouns: string[] | null
          gender_presentation: string | null
          voice_id: string | null
          voice_provider: string | null
          voice_style: string | null
          avatar_style: string | null
          avatar_asset_url: string | null
          locale: string | null
          tone: string | null
          animation_preset: string | null
          nonverbal_behavior: Json
          speaking_behavior: Json
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          facilitator_id: number
          display_name?: string | null
          pronouns?: string[] | null
          gender_presentation?: string | null
          voice_id?: string | null
          voice_provider?: string | null
          voice_style?: string | null
          avatar_style?: string | null
          avatar_asset_url?: string | null
          locale?: string | null
          tone?: string | null
          animation_preset?: string | null
          nonverbal_behavior?: Json
          speaking_behavior?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          facilitator_id?: number
          display_name?: string | null
          pronouns?: string[] | null
          gender_presentation?: string | null
          voice_id?: string | null
          voice_provider?: string | null
          voice_style?: string | null
          avatar_style?: string | null
          avatar_asset_url?: string | null
          locale?: string | null
          tone?: string | null
          animation_preset?: string | null
          nonverbal_behavior?: Json
          speaking_behavior?: Json
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facilitator_persona_configs_facilitator_id_fkey"
            columns: ["facilitator_id"]
            isOneToOne: true
            referencedRelation: "facilitators"
            referencedColumns: ["id"]
          },
        ]
      }
      facilitators: {
        Row: {
          id: number
          title: string | null
          profile_picture: string | null
          details: string | null
          is_promoted: boolean | null
          plan_id: number | null
          created_at: string | null
          lock: boolean | null
          order: number | null
          user_id: string | null
          description: string | null
          specialties: string[] | null
          languages: string[] | null
          rating: number | null
          total_sessions: number | null
          expertise_level: string | null
          last_active: string | null
          version: number | null
          config_history: Json | null
        }
        Insert: {
          id: number
          title?: string | null
          profile_picture?: string | null
          details?: string | null
          is_promoted?: boolean | null
          plan_id?: number | null
          created_at?: string | null
          lock?: boolean | null
          order?: number | null
          user_id?: string | null
          description?: string | null
          specialties?: string[] | null
          languages?: string[] | null
          rating?: number | null
          total_sessions?: number | null
          expertise_level?: string | null
          last_active?: string | null
          version?: number | null
          config_history?: Json | null
        }
        Update: {
          id?: number
          title?: string | null
          profile_picture?: string | null
          details?: string | null
          is_promoted?: boolean | null
          plan_id?: number | null
          created_at?: string | null
          lock?: boolean | null
          order?: number | null
          user_id?: string | null
          description?: string | null
          specialties?: string[] | null
          languages?: string[] | null
          rating?: number | null
          total_sessions?: number | null
          expertise_level?: string | null
          last_active?: string | null
          version?: number | null
          config_history?: Json | null
        }
        Relationships: []
      }
      faqs: {
        Row: {
          id: number
          title: string | null
          description: string | null
          status: boolean | null
          created_at: string | null
          category: string | null
        }
        Insert: {
          id: number
          title?: string | null
          description?: string | null
          status?: boolean | null
          created_at?: string | null
          category?: string | null
        }
        Update: {
          id?: number
          title?: string | null
          description?: string | null
          status?: boolean | null
          created_at?: string | null
          category?: string | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: number
          conversation_id: number | null
          user_id: string | null
          rating: number | null
          content: string | null
          facilitator_knowledge: number | null
          session_pace: number | null
          material_quality: number | null
          created_at: string | null
        }
        Insert: {
          id: number
          conversation_id?: number | null
          user_id?: string | null
          rating?: number | null
          content?: string | null
          facilitator_knowledge?: number | null
          session_pace?: number | null
          material_quality?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          conversation_id?: number | null
          user_id?: string | null
          rating?: number | null
          content?: string | null
          facilitator_knowledge?: number | null
          session_pace?: number | null
          material_quality?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      login_activity: {
        Row: {
          id: string
          user_id: string | null
          ip_address: string | null
          user_agent: string | null
          location: string | null
          created_at: string | null
          success: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          location?: string | null
          created_at?: string | null
          success?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          location?: string | null
          created_at?: string | null
          success?: boolean | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: number
          content: Json | null
          role: string | null
          created_at: string | null
          conversation_id: number | null
          facilitator_id: number | null
          user_id: string | null
          name: string | null
          updated_at: string | null
          participant_id: number | null
        }
        Insert: {
          id: number
          content?: Json | null
          role?: string | null
          created_at?: string | null
          conversation_id?: number | null
          facilitator_id?: number | null
          user_id?: string | null
          name?: string | null
          updated_at?: string | null
          participant_id?: number | null
        }
        Update: {
          id?: number
          content?: Json | null
          role?: string | null
          created_at?: string | null
          conversation_id?: number | null
          facilitator_id?: number | null
          user_id?: string | null
          name?: string | null
          updated_at?: string | null
          participant_id?: number | null
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          id: number | null
          title: string | null
          price: number | null
          plan_type: string | null
          is_popular: boolean | null
          stripe_plan_id: string | null
          currency: string | null
          no_of_facilitator: number | null
          no_of_sessions: number | null
          max_participants: number | null
          customisable_sessions: boolean | null
          customisable_facilitators: boolean | null
          saved_sessions: boolean | null
          session_reports: boolean | null
          data_export: boolean | null
        }
        Insert: {
          id?: number | null
          title?: string | null
          price?: number | null
          plan_type?: string | null
          is_popular?: boolean | null
          stripe_plan_id?: string | null
          currency?: string | null
          no_of_facilitator?: number | null
          no_of_sessions?: number | null
          max_participants?: number | null
          customisable_sessions?: boolean | null
          customisable_facilitators?: boolean | null
          saved_sessions?: boolean | null
          session_reports?: boolean | null
          data_export?: boolean | null
        }
        Update: {
          id?: number | null
          title?: string | null
          price?: number | null
          plan_type?: string | null
          is_popular?: boolean | null
          stripe_plan_id?: string | null
          currency?: string | null
          no_of_facilitator?: number | null
          no_of_sessions?: number | null
          max_participants?: number | null
          customisable_sessions?: boolean | null
          customisable_facilitators?: boolean | null
          saved_sessions?: boolean | null
          session_reports?: boolean | null
          data_export?: boolean | null
        }
        Relationships: []
      }
      plan_restrictions: {
        Row: {
          id: number
          plan_id: number | null
          facilitator_limit: number | null
          session_limit: number | null
          max_participants: number | null
          customisable_sessions: boolean | null
          data_export: boolean | null
          session_reports: boolean | null
          saved_sessions: boolean | null
          created_at: string | null
          customisable_facilitators: boolean
          question_limit: number
          custom_branding: boolean | null
          priority_support: boolean | null
        }
        Insert: {
          id: number
          plan_id?: number | null
          facilitator_limit?: number | null
          session_limit?: number | null
          max_participants?: number | null
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          session_reports?: boolean | null
          saved_sessions?: boolean | null
          created_at?: string | null
          customisable_facilitators: boolean
          question_limit?: number
          custom_branding?: boolean | null
          priority_support?: boolean | null
        }
        Update: {
          id?: number
          plan_id?: number | null
          facilitator_limit?: number | null
          session_limit?: number | null
          max_participants?: number | null
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          session_reports?: boolean | null
          saved_sessions?: boolean | null
          created_at?: string | null
          customisable_facilitators?: boolean
          question_limit?: number
          custom_branding?: boolean | null
          priority_support?: boolean | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          id: number
          title: string | null
          stripe_plan_id: string | null
          price: number | null
          plan_type: string | null
          is_popular: boolean | null
          created_at: string | null
          valid_from: string | null
          valid_until: string | null
          currency: string | null
          description: string | null
        }
        Insert: {
          id: number
          title?: string | null
          stripe_plan_id?: string | null
          price?: number | null
          plan_type?: string | null
          is_popular?: boolean | null
          created_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          currency?: string | null
          description?: string | null
        }
        Update: {
          id?: number
          title?: string | null
          stripe_plan_id?: string | null
          price?: number | null
          plan_type?: string | null
          is_popular?: boolean | null
          created_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          currency?: string | null
          description?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          role: string | null
          current_plan_id: number | null
          created_at: string
          updated_at: string
          subscription_status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          banned: boolean | null
        }
        Insert: {
          id: string
          role?: string | null
          current_plan_id?: number | null
          created_at?: string
          updated_at?: string
          subscription_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          banned?: boolean | null
        }
        Update: {
          id?: string
          role?: string | null
          current_plan_id?: number | null
          created_at?: string
          updated_at?: string
          subscription_status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          banned?: boolean | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          id: string
          user_id: string | null
          event_type: string
          event_details: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          event_type: string
          event_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          event_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      session_events: {
        Row: {
          id: number
          conversation_id: number
          event_type: string
          data: Json | null
          created_at: string
        }
        Insert: {
          id: number
          conversation_id: number
          event_type: string
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          conversation_id?: number
          event_type?: string
          data?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      session_participants: {
        Row: {
          id: number
          conversation_id: number
          participant_id: number
          name: string
          avatar_seed: string | null
          created_at: string | null
          is_anonymous: boolean | null
          is_host: boolean
          device_id: string | null
        }
        Insert: {
          id?: number
          conversation_id: number
          participant_id: number
          name: string
          avatar_seed?: string | null
          created_at?: string | null
          is_anonymous?: boolean | null
          is_host?: boolean
          device_id?: string | null
        }
        Update: {
          id?: number
          conversation_id?: number
          participant_id?: number
          name?: string
          avatar_seed?: string | null
          created_at?: string | null
          is_anonymous?: boolean | null
          is_host?: boolean
          device_id?: string | null
        }
        Relationships: []
      }
      session_reports: {
        Row: {
          id: string
          conversation_id: number
          report_content: string
          report_type: string
          generated_at: string
          generated_by: string | null
          metadata: Json | null
          file_url: string | null
          file_size: number | null
        }
        Insert: {
          id?: string
          conversation_id: number
          report_content: string
          report_type?: string
          generated_at?: string
          generated_by?: string | null
          metadata?: Json | null
          file_url?: string | null
          file_size?: number | null
        }
        Update: {
          id?: string
          conversation_id?: number
          report_content?: string
          report_type?: string
          generated_at?: string
          generated_by?: string | null
          metadata?: Json | null
          file_url?: string | null
          file_size?: number | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          id: number
          facilitator: number | null
          title: string | null
          scope: string | null
          gpt_version: string | null
          max_tokens: string | null
          randomness: number | null
          status: boolean | null
          prompt: string | null
          output_format: string | null
          welcome_message: string | null
          created_at: string | null
          lock: boolean | null
          objective: string | null
          icon_type: string | null
          session_type: string | null
          duration_minutes: number | null
          skill_level: string | null
          tags: string[] | null
          prerequisites: string[] | null
          learning_outcomes: string[] | null
          category_id: number | null
          difficulty_level: string | null
        }
        Insert: {
          id: number
          facilitator?: number | null
          title?: string | null
          scope?: string | null
          gpt_version?: string | null
          max_tokens?: string | null
          randomness?: number | null
          status?: boolean | null
          prompt?: string | null
          output_format?: string | null
          welcome_message?: string | null
          created_at?: string | null
          lock?: boolean | null
          objective?: string | null
          icon_type?: string | null
          session_type?: string | null
          duration_minutes?: number | null
          skill_level?: string | null
          tags?: string[] | null
          prerequisites?: string[] | null
          learning_outcomes?: string[] | null
          category_id?: number | null
          difficulty_level?: string | null
        }
        Update: {
          id?: number
          facilitator?: number | null
          title?: string | null
          scope?: string | null
          gpt_version?: string | null
          max_tokens?: string | null
          randomness?: number | null
          status?: boolean | null
          prompt?: string | null
          output_format?: string | null
          welcome_message?: string | null
          created_at?: string | null
          lock?: boolean | null
          objective?: string | null
          icon_type?: string | null
          session_type?: string | null
          duration_minutes?: number | null
          skill_level?: string | null
          tags?: string[] | null
          prerequisites?: string[] | null
          learning_outcomes?: string[] | null
          category_id?: number | null
          difficulty_level?: string | null
        }
        Relationships: []
      }
      sessions_history: {
        Row: {
          id: number
          session_id: number | null
          facilitator_id: number | null
          participant_count: number | null
          duration_minutes: number | null
          language: string | null
          started_at: string | null
          ended_at: string | null
          feedback_score: number | null
          feedback_text: string | null
          created_at: string | null
          success_rate: number | null
          completion_status: string | null
        }
        Insert: {
          id: number
          session_id?: number | null
          facilitator_id?: number | null
          participant_count?: number | null
          duration_minutes?: number | null
          language?: string | null
          started_at?: string | null
          ended_at?: string | null
          feedback_score?: number | null
          feedback_text?: string | null
          created_at?: string | null
          success_rate?: number | null
          completion_status?: string | null
        }
        Update: {
          id?: number
          session_id?: number | null
          facilitator_id?: number | null
          participant_count?: number | null
          duration_minutes?: number | null
          language?: string | null
          started_at?: string | null
          ended_at?: string | null
          feedback_score?: number | null
          feedback_text?: string | null
          created_at?: string | null
          success_rate?: number | null
          completion_status?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string | null
          session_token: string
          device_name: string | null
          device_type: string | null
          browser: string | null
          os: string | null
          ip_address: string | null
          location: string | null
          user_agent: string | null
          is_current: boolean | null
          last_activity: string | null
          created_at: string | null
          expires_at: string | null
          revoked_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_token: string
          device_name?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          ip_address?: string | null
          location?: string | null
          user_agent?: string | null
          is_current?: boolean | null
          last_activity?: string | null
          created_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          session_token?: string
          device_name?: string | null
          device_type?: string | null
          browser?: string | null
          os?: string | null
          ip_address?: string | null
          location?: string | null
          user_agent?: string | null
          is_current?: boolean | null
          last_activity?: string | null
          created_at?: string | null
          expires_at?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_session_host: {
        Args: {
          session_id: number
          user_id: string
        }
        Returns: boolean
      }
      is_system_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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

