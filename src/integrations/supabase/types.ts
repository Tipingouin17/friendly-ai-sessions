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
          id: number
          is_saved: boolean
          is_session_ended: boolean | null
          language: string | null
          participant_description: string | null
          participants: number | null
          sessions_id: number | null
          user_id: string | null
        }
        Insert: {
          accept_terms_and_conditions?: boolean | null
          created_at?: string | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participants?: number | null
          sessions_id?: number | null
          user_id?: string | null
        }
        Update: {
          accept_terms_and_conditions?: boolean | null
          created_at?: string | null
          id?: number
          is_saved?: boolean
          is_session_ended?: boolean | null
          language?: string | null
          participant_description?: string | null
          participants?: number | null
          sessions_id?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_sessions_id_fkey"
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
          created_at: string | null
          details: string | null
          id: number
          is_promoted: boolean | null
          lock: boolean | null
          order: number | null
          plan_id: number | null
          profile_picture: string | null
          title: string | null
          user_id: string | null
          vst: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: number
          is_promoted?: boolean | null
          lock?: boolean | null
          order?: number | null
          plan_id?: number | null
          profile_picture?: string | null
          title?: string | null
          user_id?: string | null
          vst?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: number
          is_promoted?: boolean | null
          lock?: boolean | null
          order?: number | null
          plan_id?: number | null
          profile_picture?: string | null
          title?: string | null
          user_id?: string | null
          vst?: string | null
        }
        Relationships: [
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
          created_at: string | null
          description: string | null
          id: number
          status: boolean | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: number
          status?: boolean | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: number
          status?: boolean | null
          title?: string | null
        }
        Relationships: []
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
          user_id?: string | null
        }
        Relationships: [
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
          customisable_sessions: boolean | null
          data_export: boolean | null
          id: number
          max_participants: number | null
          no_of_facilitator: number | null
          no_of_sessions: number | null
          plan_id: number | null
          saved_sessions: boolean | null
          session_reports: boolean | null
        }
        Insert: {
          created_at?: string | null
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          id?: number
          max_participants?: number | null
          no_of_facilitator?: number | null
          no_of_sessions?: number | null
          plan_id?: number | null
          saved_sessions?: boolean | null
          session_reports?: boolean | null
        }
        Update: {
          created_at?: string | null
          customisable_sessions?: boolean | null
          data_export?: boolean | null
          id?: number
          max_participants?: number | null
          no_of_facilitator?: number | null
          no_of_sessions?: number | null
          plan_id?: number | null
          saved_sessions?: boolean | null
          session_reports?: boolean | null
        }
        Relationships: [
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
          id: number
          is_popular: boolean | null
          plan_details: Json | null
          plan_table_details: Json | null
          plan_type: string | null
          price: number | null
          stripe_plan_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_popular?: boolean | null
          plan_details?: Json | null
          plan_table_details?: Json | null
          plan_type?: string | null
          price?: number | null
          stripe_plan_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_popular?: boolean | null
          plan_details?: Json | null
          plan_table_details?: Json | null
          plan_type?: string | null
          price?: number | null
          stripe_plan_id?: string | null
          title?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          facilitator: number | null
          gpt_version: string | null
          id: number
          lock: boolean | null
          max_tokens: string | null
          objective: string | null
          output_format: string | null
          profile_picture: string | null
          prompt: string | null
          randomness: number | null
          scope: string | null
          status: boolean | null
          title: string | null
          welcome_message: string | null
        }
        Insert: {
          created_at?: string | null
          facilitator?: number | null
          gpt_version?: string | null
          id?: number
          lock?: boolean | null
          max_tokens?: string | null
          objective?: string | null
          output_format?: string | null
          profile_picture?: string | null
          prompt?: string | null
          randomness?: number | null
          scope?: string | null
          status?: boolean | null
          title?: string | null
          welcome_message?: string | null
        }
        Update: {
          created_at?: string | null
          facilitator?: number | null
          gpt_version?: string | null
          id?: number
          lock?: boolean | null
          max_tokens?: string | null
          objective?: string | null
          output_format?: string | null
          profile_picture?: string | null
          prompt?: string | null
          randomness?: number | null
          scope?: string | null
          status?: boolean | null
          title?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_facilitator_fkey"
            columns: ["facilitator"]
            isOneToOne: false
            referencedRelation: "facilitators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
