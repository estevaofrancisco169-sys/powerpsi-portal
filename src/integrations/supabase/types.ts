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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_logs: {
        Row: {
          id: string
          ocorrido_em: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ocorrido_em?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ocorrido_em?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      active_sessions: {
        Row: {
          iniciada_em: string
          session_id: string
          ultimo_ping: string
          user_id: string
        }
        Insert: {
          iniciada_em?: string
          session_id: string
          ultimo_ping?: string
          user_id: string
        }
        Update: {
          iniciada_em?: string
          session_id?: string
          ultimo_ping?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          ativo: boolean
          cnpj: string
          created_at: string
          id: string
          razao_social: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          created_at?: string
          id?: string
          razao_social: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          created_at?: string
          id?: string
          razao_social?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          cnpj: string | null
          created_at: string
          documento: string | null
          documento_tipo: string | null
          email: string
          empresa: string | null
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          email: string
          empresa?: string | null
          id: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          documento?: string | null
          documento_tipo?: string | null
          email?: string
          empresa?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_views: {
        Row: {
          concluido: boolean
          id: string
          max_progresso_seg: number
          primeira_vez: string
          progresso_seg: number
          ultima_vez: string
          user_id: string
          video_id: string
        }
        Insert: {
          concluido?: boolean
          id?: string
          max_progresso_seg?: number
          primeira_vez?: string
          progresso_seg?: number
          ultima_vez?: string
          user_id: string
          video_id: string
        }
        Update: {
          concluido?: boolean
          id?: string
          max_progresso_seg?: number
          primeira_vez?: string
          progresso_seg?: number
          ultima_vez?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          capa_path: string | null
          categoria_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          duracao_min: number | null
          duracao_seg: number | null
          habilidades: string[]
          id: string
          ordem: number
          publicado: boolean
          tema: string | null
          titulo: string
          updated_at: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          capa_path?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao_min?: number | null
          duracao_seg?: number | null
          habilidades?: string[]
          id?: string
          ordem?: number
          publicado?: boolean
          tema?: string | null
          titulo: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          capa_path?: string | null
          categoria_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          duracao_min?: number | null
          duracao_seg?: number | null
          habilidades?: string[]
          id?: string
          ordem?: number
          publicado?: boolean
          tema?: string | null
          titulo?: string
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validar_cnpj_cliente: {
        Args: { _cnpj: string }
        Returns: {
          razao_social: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "aluno"
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
      app_role: ["admin", "aluno"],
    },
  },
} as const
