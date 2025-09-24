export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      buy_button_clicks: {
        Row: {
          clicked_at: string
          id: string
          location: string | null
          places_count: number | null
          route_generation_id: string | null
          user_session_id: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          location?: string | null
          places_count?: number | null
          route_generation_id?: string | null
          user_session_id?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          location?: string | null
          places_count?: number | null
          route_generation_id?: string | null
          user_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buy_button_clicks_route_generation_id_fkey"
            columns: ["route_generation_id"]
            isOneToOne: false
            referencedRelation: "route_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_exits: {
        Row: {
          clicked_at: string
          current_location: string | null
          exit_action: string | null
          id: string
          user_session_id: string
        }
        Insert: {
          clicked_at?: string
          current_location?: string | null
          exit_action?: string | null
          id?: string
          user_session_id: string
        }
        Update: {
          clicked_at?: string
          current_location?: string | null
          exit_action?: string | null
          id?: string
          user_session_id?: string
        }
        Relationships: []
      }
      route_generations: {
        Row: {
          generated_at: string
          goals: string[] | null
          id: string
          location: string
          places_count: number | null
          places_generated: Json | null
          time_window: string | null
          user_session_id: string | null
        }
        Insert: {
          generated_at?: string
          goals?: string[] | null
          id?: string
          location: string
          places_count?: number | null
          places_generated?: Json | null
          time_window?: string | null
          user_session_id?: string | null
        }
        Update: {
          generated_at?: string
          goals?: string[] | null
          id?: string
          location?: string
          places_count?: number | null
          places_generated?: Json | null
          time_window?: string | null
          user_session_id?: string | null
        }
        Relationships: []
      }
      route_purchases: {
        Row: {
          id: string
          location: string | null
          places_count: number | null
          purchased_at: string
          route_generation_id: string | null
          user_session_id: string | null
        }
        Insert: {
          id?: string
          location?: string | null
          places_count?: number | null
          purchased_at?: string
          route_generation_id?: string | null
          user_session_id?: string | null
        }
        Update: {
          id?: string
          location?: string | null
          places_count?: number | null
          purchased_at?: string
          route_generation_id?: string | null
          user_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "route_purchases_route_generation_id_fkey"
            columns: ["route_generation_id"]
            isOneToOne: false
            referencedRelation: "route_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          created_at: string
          days: number | null
          goals: string[]
          id: string
          location: string
          map_url: string | null
          places: Json
          route_name: string
          scenario: string
          total_places: number
          total_walking_time: number | null
          updated_at: string
          user_session_id: string
        }
        Insert: {
          created_at?: string
          days?: number | null
          goals: string[]
          id?: string
          location: string
          map_url?: string | null
          places: Json
          route_name: string
          scenario: string
          total_places: number
          total_walking_time?: number | null
          updated_at?: string
          user_session_id: string
        }
        Update: {
          created_at?: string
          days?: number | null
          goals?: string[]
          id?: string
          location?: string
          map_url?: string | null
          places?: Json
          route_name?: string
          scenario?: string
          total_places?: number
          total_walking_time?: number | null
          updated_at?: string
          user_session_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          id: string
          location: string | null
          places_count: number | null
          rating: number | null
          route_generation_id: string | null
          submitted_at: string
          text_feedback: string | null
          user_session_id: string | null
        }
        Insert: {
          id?: string
          location?: string | null
          places_count?: number | null
          rating?: number | null
          route_generation_id?: string | null
          submitted_at?: string
          text_feedback?: string | null
          user_session_id?: string | null
        }
        Update: {
          id?: string
          location?: string | null
          places_count?: number | null
          rating?: number | null
          route_generation_id?: string | null
          submitted_at?: string
          text_feedback?: string | null
          user_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_route_generation_id_fkey"
            columns: ["route_generation_id"]
            isOneToOne: false
            referencedRelation: "route_generations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          first_visit_at: string
          id: string
          ip_address: string | null
          last_visit_at: string
          referrer: string | null
          user_agent: string | null
          user_session_id: string
          visit_count: number
        }
        Insert: {
          first_visit_at?: string
          id?: string
          ip_address?: string | null
          last_visit_at?: string
          referrer?: string | null
          user_agent?: string | null
          user_session_id: string
          visit_count?: number
        }
        Update: {
          first_visit_at?: string
          id?: string
          ip_address?: string | null
          last_visit_at?: string
          referrer?: string | null
          user_agent?: string | null
          user_session_id?: string
          visit_count?: number
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          desired_city: string
          email: string
          id: string
          ip_address: string | null
          submitted_at: string | null
          user_agent: string | null
          user_session_id: string | null
        }
        Insert: {
          desired_city: string
          email: string
          id?: string
          ip_address?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          user_session_id?: string | null
        }
        Update: {
          desired_city?: string
          email?: string
          id?: string
          ip_address?: string | null
          submitted_at?: string | null
          user_agent?: string | null
          user_session_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: {
        Args: { user_uuid?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
