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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ajuste: {
        Row: {
          creado_en: string
          horas: number
          id: string
          importe: number
          motivo: string
          semana_id: string
          turno_id: string
        }
        Insert: {
          creado_en?: string
          horas: number
          id?: string
          importe: number
          motivo: string
          semana_id: string
          turno_id: string
        }
        Update: {
          creado_en?: string
          horas?: number
          id?: string
          importe?: number
          motivo?: string
          semana_id?: string
          turno_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajuste_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semana"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajuste_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id"]
          },
        ]
      }
      ausencia: {
        Row: {
          creado_en: string
          dia: number
          estado: string
          id: string
          motivo: string
          motivo_rechazo: string | null
          persona_id: string
          resuelto_en: string | null
          semana_id: string
        }
        Insert: {
          creado_en?: string
          dia: number
          estado?: string
          id?: string
          motivo?: string
          motivo_rechazo?: string | null
          persona_id: string
          resuelto_en?: string | null
          semana_id: string
        }
        Update: {
          creado_en?: string
          dia?: number
          estado?: string
          id?: string
          motivo?: string
          motivo_rechazo?: string | null
          persona_id?: string
          resuelto_en?: string | null
          semana_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ausencia_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencia_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semana"
            referencedColumns: ["id"]
          },
        ]
      }
      comando: {
        Row: {
          creado_en: string
          datos: Json
          id: string
          resultado: Json | null
          tipo: string
          usuario: string | null
        }
        Insert: {
          creado_en?: string
          datos: Json
          id: string
          resultado?: Json | null
          tipo: string
          usuario?: string | null
        }
        Update: {
          creado_en?: string
          datos?: Json
          id?: string
          resultado?: Json | null
          tipo?: string
          usuario?: string | null
        }
        Relationships: []
      }
      franja: {
        Row: {
          cobertura_minima: number
          cupo_maximo: number
          dia: number
          etiqueta: string | null
          fecha: string | null
          fin: string
          habilidad_requerida: string | null
          id: string
          inicio: string
          local_id: string
          puesto_id: string
          semana_id: string
          ts_fin: string | null
          ts_inicio: string | null
        }
        Insert: {
          cobertura_minima?: number
          cupo_maximo?: number
          dia: number
          etiqueta?: string | null
          fecha?: string | null
          fin: string
          habilidad_requerida?: string | null
          id?: string
          inicio: string
          local_id: string
          puesto_id: string
          semana_id: string
          ts_fin?: string | null
          ts_inicio?: string | null
        }
        Update: {
          cobertura_minima?: number
          cupo_maximo?: number
          dia?: number
          etiqueta?: string | null
          fecha?: string | null
          fin?: string
          habilidad_requerida?: string | null
          id?: string
          inicio?: string
          local_id?: string
          puesto_id?: string
          semana_id?: string
          ts_fin?: string | null
          ts_inicio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "franja_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "local"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franja_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "franja_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semana"
            referencedColumns: ["id"]
          },
        ]
      }
      intercambio: {
        Row: {
          creado_en: string
          estado: string
          id: string
          motivo_rechazo: string | null
          nota: string
          persona_a: string
          persona_b: string
          resuelto_en: string | null
          semana_id: string
          turno_a: string
          turno_b: string | null
        }
        Insert: {
          creado_en?: string
          estado?: string
          id?: string
          motivo_rechazo?: string | null
          nota?: string
          persona_a: string
          persona_b: string
          resuelto_en?: string | null
          semana_id: string
          turno_a: string
          turno_b?: string | null
        }
        Update: {
          creado_en?: string
          estado?: string
          id?: string
          motivo_rechazo?: string | null
          nota?: string
          persona_a?: string
          persona_b?: string
          resuelto_en?: string | null
          semana_id?: string
          turno_a?: string
          turno_b?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intercambio_persona_a_fkey"
            columns: ["persona_a"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercambio_persona_b_fkey"
            columns: ["persona_b"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercambio_semana_id_fkey"
            columns: ["semana_id"]
            isOneToOne: false
            referencedRelation: "semana"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercambio_turno_a_fkey"
            columns: ["turno_a"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intercambio_turno_b_fkey"
            columns: ["turno_b"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id"]
          },
        ]
      }
      local: {
        Row: {
          id: string
          nombre: string
        }
        Insert: {
          id: string
          nombre: string
        }
        Update: {
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      no_disponible: {
        Row: {
          dia: number
          persona_id: string
        }
        Insert: {
          dia: number
          persona_id: string
        }
        Update: {
          dia?: number
          persona_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "no_disponible_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
      }
      parametros: {
        Row: {
          descanso_min_h: number
          id: number
          max_dias_seguidos: number
          mult_extra: number
          prima_dominical: number
          tope_semanal_default: number
        }
        Insert: {
          descanso_min_h?: number
          id?: number
          max_dias_seguidos?: number
          mult_extra?: number
          prima_dominical?: number
          tope_semanal_default?: number
        }
        Update: {
          descanso_min_h?: number
          id?: number
          max_dias_seguidos?: number
          mult_extra?: number
          prima_dominical?: number
          tope_semanal_default?: number
        }
        Relationships: []
      }
      persona: {
        Row: {
          alias: string
          email: string
          habilidades: string[]
          id: string
          locales: string[]
          tope_semanal: number
        }
        Insert: {
          alias: string
          email: string
          habilidades?: string[]
          id: string
          locales?: string[]
          tope_semanal?: number
        }
        Update: {
          alias?: string
          email?: string
          habilidades?: string[]
          id?: string
          locales?: string[]
          tope_semanal?: number
        }
        Relationships: []
      }
      puesto: {
        Row: {
          habilidad_requerida: string | null
          id: string
          nombre: string
        }
        Insert: {
          habilidad_requerida?: string | null
          id: string
          nombre: string
        }
        Update: {
          habilidad_requerida?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      semana: {
        Row: {
          cerrada_en: string | null
          estado: string
          id: string
          revision: number
        }
        Insert: {
          cerrada_en?: string | null
          estado?: string
          id: string
          revision?: number
        }
        Update: {
          cerrada_en?: string | null
          estado?: string
          id?: string
          revision?: number
        }
        Relationships: []
      }
      tarifa: {
        Row: {
          creado_en: string
          id: number
          importe: number
          puesto_id: string
          vigente_desde: string
        }
        Insert: {
          creado_en?: string
          id?: number
          importe: number
          puesto_id: string
          vigente_desde: string
        }
        Update: {
          creado_en?: string
          id?: number
          importe?: number
          puesto_id?: string
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarifa_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
        ]
      }
      turno: {
        Row: {
          costo_congelado: number | null
          creado_en: string
          estado: string
          franja_id: string
          id: string
          origen_id: string | null
          persona_id: string
          tarifa_aplicada: number
        }
        Insert: {
          costo_congelado?: number | null
          creado_en?: string
          estado?: string
          franja_id: string
          id?: string
          origen_id?: string | null
          persona_id: string
          tarifa_aplicada: number
        }
        Update: {
          costo_congelado?: number | null
          creado_en?: string
          estado?: string
          franja_id?: string
          id?: string
          origen_id?: string | null
          persona_id?: string
          tarifa_aplicada?: number
        }
        Relationships: [
          {
            foreignKeyName: "turno_franja_id_fkey"
            columns: ["franja_id"]
            isOneToOne: false
            referencedRelation: "franja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_origen_id_fkey"
            columns: ["origen_id"]
            isOneToOne: false
            referencedRelation: "turno"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "turno_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _costos_semana: {
        Args: { _semana: string }
        Returns: {
          alias: string
          congelado: boolean
          costo: number
          dia: number
          domingo: boolean
          fecha: string
          fin: string
          franja_id: string
          horas: number
          horas_extra: number
          inicio: string
          local_id: string
          persona_id: string
          puesto_id: string
          tarifa: number
          turno_id: string
        }[]
      }
      _seed_turno: {
        Args: {
          _dia: number
          _inicio: string
          _local: string
          _persona: string
          _puesto: string
          _semana: string
        }
        Returns: undefined
      }
      costos_semana: {
        Args: { _semana: string }
        Returns: {
          alias: string
          congelado: boolean
          costo: number
          dia: number
          domingo: boolean
          fecha: string
          fin: string
          franja_id: string
          horas: number
          horas_extra: number
          inicio: string
          local_id: string
          persona_id: string
          puesto_id: string
          tarifa: number
          turno_id: string
        }[]
      }
      ejecutar_comando: {
        Args: { _datos: Json; _id: string; _tipo: string }
        Returns: Json
      }
      es_staff: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      persona_actual: { Args: never; Returns: string }
      reiniciar_demo: { Args: never; Returns: undefined }
      tarifa_vigente: {
        Args: { _fecha: string; _puesto: string }
        Returns: number
      }
      turnos_intercambiables: {
        Args: { _persona: string }
        Returns: {
          fecha: string
          fin: string
          inicio: string
          local: string
          puesto: string
          turno_id: string
        }[]
      }
      validar_asignacion: {
        Args: { _franja: string; _persona: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "encargado" | "equipo"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "encargado", "equipo"],
    },
  },
} as const
