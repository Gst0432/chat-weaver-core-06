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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      audio_recordings: {
        Row: {
          created_at: string
          duration: number
          file_path: string
          file_size: number
          id: string
          mime_type: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          team_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      ebook_generations: {
        Row: {
          author: string
          completed_at: string | null
          created_at: string
          current_chapter: number | null
          ebook_id: string | null
          error_message: string | null
          generated_chapters: number | null
          id: string
          model: string
          progress: number
          prompt: string
          status: string
          template: string
          title: string
          total_chapters: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author: string
          completed_at?: string | null
          created_at?: string
          current_chapter?: number | null
          ebook_id?: string | null
          error_message?: string | null
          generated_chapters?: number | null
          id?: string
          model: string
          progress?: number
          prompt: string
          status?: string
          template: string
          title: string
          total_chapters?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          completed_at?: string | null
          created_at?: string
          current_chapter?: number | null
          ebook_id?: string | null
          error_message?: string | null
          generated_chapters?: number | null
          id?: string
          model?: string
          progress?: number
          prompt?: string
          status?: string
          template?: string
          title?: string
          total_chapters?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_generations_ebook_id_fkey"
            columns: ["ebook_id"]
            isOneToOne: false
            referencedRelation: "ebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      ebooks: {
        Row: {
          author: string
          content_markdown: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          title: string
          user_id: string
        }
        Insert: {
          author: string
          content_markdown?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          title: string
          user_id: string
        }
        Update: {
          author?: string
          content_markdown?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      embeddings: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          embedding: string
          id: number
          message_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          embedding: string
          id?: number
          message_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          embedding?: string
          id?: number
          message_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      generated_apps: {
        Row: {
          app_name: string
          app_type: string
          created_at: string
          generated_content: Json
          generation_options: Json | null
          id: string
          industry: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_name: string
          app_type: string
          created_at?: string
          generated_content: Json
          generation_options?: Json | null
          id?: string
          industry: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_name?: string
          app_type?: string
          created_at?: string
          generated_content?: Json
          generation_options?: Json | null
          id?: string
          industry?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_videos: {
        Row: {
          created_at: string | null
          duration: number | null
          height: number | null
          id: string
          prompt: string | null
          provider: string | null
          storage_path: string
          title: string
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          prompt?: string | null
          provider?: string | null
          storage_path: string
          title: string
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          duration?: number | null
          height?: number | null
          id?: string
          prompt?: string | null
          provider?: string | null
          storage_path?: string
          title?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      minute_purchases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          email: string
          id: string
          minutes: number
          payment_reference: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          email: string
          id?: string
          minutes: number
          payment_reference: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          email?: string
          id?: string
          minutes?: number
          payment_reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      saas_templates: {
        Row: {
          created_at: string
          id: string
          industry: string
          is_public: boolean | null
          template_content: Json
          template_name: string
          template_type: string
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry: string
          is_public?: boolean | null
          template_content: Json
          template_name: string
          template_type: string
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string
          is_public?: boolean | null
          template_content?: Json
          template_name?: string
          template_type?: string
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          free_generations_limit: number | null
          free_generations_used: number | null
          id: string
          minutes_balance: number | null
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          total_minutes_purchased: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          free_generations_limit?: number | null
          free_generations_used?: number | null
          id?: string
          minutes_balance?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          total_minutes_purchased?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          free_generations_limit?: number | null
          free_generations_used?: number | null
          id?: string
          minutes_balance?: number | null
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          total_minutes_purchased?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          features: Json | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string | null
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          language: string
          original_text: string
          recording_id: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          language?: string
          original_text: string
          recording_id: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          language?: string
          original_text?: string
          recording_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "audio_recordings"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_sessions: {
        Row: {
          created_at: string
          id: string
          source_language: string
          target_language: string
          transcription_id: string
          translated_text: string
          user_id: string
          voiceover_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          source_language: string
          target_language: string
          transcription_id: string
          translated_text: string
          user_id: string
          voiceover_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          source_language?: string
          target_language?: string
          transcription_id?: string
          translated_text?: string
          user_id?: string
          voiceover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_sessions_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      tts_history: {
        Row: {
          audio_url: string | null
          created_at: string
          format: string
          id: string
          speed: number
          text: string
          updated_at: string
          user_id: string
          voice: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          format?: string
          id?: string
          speed?: number
          text: string
          updated_at?: string
          user_id: string
          voice?: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          format?: string
          id?: string
          speed?: number
          text?: string
          updated_at?: string
          user_id?: string
          voice?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          default_technical_features: Json | null
          favorite_colors: string[] | null
          favorite_industries: string[] | null
          favorite_styles: string[] | null
          generation_history: Json | null
          id: string
          template_preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_technical_features?: Json | null
          favorite_colors?: string[] | null
          favorite_industries?: string[] | null
          favorite_styles?: string[] | null
          generation_history?: Json | null
          id?: string
          template_preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_technical_features?: Json | null
          favorite_colors?: string[] | null
          favorite_industries?: string[] | null
          favorite_styles?: string[] | null
          generation_history?: Json | null
          id?: string
          template_preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      youtube_transcriptions: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          processing_status: string
          segments: Json
          source_language: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          processing_status?: string
          segments?: Json
          source_language?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          processing_status?: string
          segments?: Json
          source_language?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_transcriptions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "youtube_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_translations: {
        Row: {
          created_at: string
          id: string
          target_language: string
          transcription_id: string
          translated_segments: Json
          updated_at: string
          user_id: string
          voiceover_settings: Json | null
          voiceover_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          target_language: string
          transcription_id: string
          translated_segments?: Json
          updated_at?: string
          user_id: string
          voiceover_settings?: Json | null
          voiceover_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          target_language?: string
          transcription_id?: string
          translated_segments?: Json
          updated_at?: string
          user_id?: string
          voiceover_settings?: Json | null
          voiceover_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "youtube_translations_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "youtube_transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      youtube_videos: {
        Row: {
          audio_url: string | null
          created_at: string
          duration: number
          extraction_status: string
          id: string
          title: string
          updated_at: string
          url: string
          user_id: string
          video_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          duration?: number
          extraction_status?: string
          id?: string
          title: string
          updated_at?: string
          url: string
          user_id: string
          video_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          duration?: number
          extraction_status?: string
          id?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      check_free_generation_quota: {
        Args: { user_email: string }
        Returns: Json
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      increment_free_generation: {
        Args: { user_email: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: unknown
      }
      log_team_activity: {
        Args: {
          p_action: string
          p_admin_user_id: string
          p_details?: Json
          p_target_id?: string
          p_target_type?: string
          p_team_id: string
        }
        Returns: string
      }
      match_embeddings: {
        Args: { conv_id: string; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          distance: number
          id: number
          message_id: string
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      app_role: "user" | "admin" | "super_admin"
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
      app_role: ["user", "admin", "super_admin"],
    },
  },
} as const
