export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string;
          error_code: string | null;
          form_id: string | null;
          id: string;
          input_tokens: number | null;
          latency_ms: number | null;
          model: string;
          operation: string;
          output_tokens: number | null;
          prompt_version: string;
          status: string;
          user_id: string | null;
          workspace_id: string | null;
        };
        Insert: {
          created_at?: string;
          error_code?: string | null;
          form_id?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model: string;
          operation: string;
          output_tokens?: number | null;
          prompt_version: string;
          status: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          created_at?: string;
          error_code?: string | null;
          form_id?: string | null;
          id?: string;
          input_tokens?: number | null;
          latency_ms?: number | null;
          model?: string;
          operation?: string;
          output_tokens?: number | null;
          prompt_version?: string;
          status?: string;
          user_id?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_generations_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_generations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      assets: {
        Row: {
          created_at: string;
          created_by: string;
          filename: string;
          id: string;
          kind: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          filename: string;
          id?: string;
          kind: string;
          mime_type: string;
          size_bytes: number;
          storage_path: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          filename?: string;
          id?: string;
          kind?: string;
          mime_type?: string;
          size_bytes?: number;
          storage_path?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      form_events: {
        Row: {
          created_at: string;
          event_type: Database["public"]["Enums"]["form_event_type"];
          field_id: string | null;
          form_id: string;
          form_version_id: string;
          id: string;
          metadata: Json;
          page_id: string | null;
          session_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: Database["public"]["Enums"]["form_event_type"];
          field_id?: string | null;
          form_id: string;
          form_version_id: string;
          id?: string;
          metadata?: Json;
          page_id?: string | null;
          session_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: Database["public"]["Enums"]["form_event_type"];
          field_id?: string | null;
          form_id?: string;
          form_version_id?: string;
          id?: string;
          metadata?: Json;
          page_id?: string | null;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "form_events_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_events_form_version_id_fkey";
            columns: ["form_version_id"];
            isOneToOne: false;
            referencedRelation: "form_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_events_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "form_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      form_sessions: {
        Row: {
          completed_at: string | null;
          duration_ms: number | null;
          form_id: string;
          form_version_id: string;
          id: string;
          is_test: boolean;
          last_page_id: string | null;
          metadata: Json;
          started_at: string;
          status: Database["public"]["Enums"]["form_session_status"];
        };
        Insert: {
          completed_at?: string | null;
          duration_ms?: number | null;
          form_id: string;
          form_version_id: string;
          id?: string;
          is_test?: boolean;
          last_page_id?: string | null;
          metadata?: Json;
          started_at?: string;
          status?: Database["public"]["Enums"]["form_session_status"];
        };
        Update: {
          completed_at?: string | null;
          duration_ms?: number | null;
          form_id?: string;
          form_version_id?: string;
          id?: string;
          is_test?: boolean;
          last_page_id?: string | null;
          metadata?: Json;
          started_at?: string;
          status?: Database["public"]["Enums"]["form_session_status"];
        };
        Relationships: [
          {
            foreignKeyName: "form_sessions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "form_sessions_form_version_id_fkey";
            columns: ["form_version_id"];
            isOneToOne: false;
            referencedRelation: "form_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      form_versions: {
        Row: {
          created_at: string;
          created_by: string;
          definition: Json;
          form_id: string;
          id: string;
          schema_version: number;
          version_number: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          definition: Json;
          form_id: string;
          id?: string;
          schema_version: number;
          version_number: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          definition?: Json;
          form_id?: string;
          id?: string;
          schema_version?: number;
          version_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "form_versions_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
        ];
      };
      forms: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          draft_definition: Json;
          draft_revision: number;
          id: string;
          published_version_id: string | null;
          schema_version: number;
          slug: string;
          status: Database["public"]["Enums"]["form_status"];
          title: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          draft_definition: Json;
          draft_revision?: number;
          id?: string;
          published_version_id?: string | null;
          schema_version: number;
          slug: string;
          status?: Database["public"]["Enums"]["form_status"];
          title: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          draft_definition?: Json;
          draft_revision?: number;
          id?: string;
          published_version_id?: string | null;
          schema_version?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["form_status"];
          title?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "forms_published_version_fk";
            columns: ["published_version_id"];
            isOneToOne: false;
            referencedRelation: "form_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "forms_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      rate_limits: {
        Row: {
          count: number;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          key: string;
          window_start: string;
        };
        Update: {
          count?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      response_answers: {
        Row: {
          created_at: string;
          field_id: string;
          field_type: string;
          id: string;
          response_id: string;
          value: Json | null;
        };
        Insert: {
          created_at?: string;
          field_id: string;
          field_type: string;
          id?: string;
          response_id: string;
          value?: Json | null;
        };
        Update: {
          created_at?: string;
          field_id?: string;
          field_type?: string;
          id?: string;
          response_id?: string;
          value?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "response_answers_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "responses";
            referencedColumns: ["id"];
          },
        ];
      };
      responses: {
        Row: {
          duration_ms: number | null;
          form_id: string;
          form_version_id: string;
          id: string;
          idempotency_key: string;
          note: string | null;
          read_at: string | null;
          session_id: string;
          status: Database["public"]["Enums"]["response_status"];
          submitted_at: string;
        };
        Insert: {
          duration_ms?: number | null;
          form_id: string;
          form_version_id: string;
          id?: string;
          idempotency_key: string;
          note?: string | null;
          read_at?: string | null;
          session_id: string;
          status?: Database["public"]["Enums"]["response_status"];
          submitted_at?: string;
        };
        Update: {
          duration_ms?: number | null;
          form_id?: string;
          form_version_id?: string;
          id?: string;
          idempotency_key?: string;
          note?: string | null;
          read_at?: string | null;
          session_id?: string;
          status?: Database["public"]["Enums"]["response_status"];
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "responses_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_form_version_id_fkey";
            columns: ["form_version_id"];
            isOneToOne: false;
            referencedRelation: "form_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "responses_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "form_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_form_triggers: {
        Row: {
          created_at: string;
          form_id: string;
          workflow_id: string;
        };
        Insert: {
          created_at?: string;
          form_id: string;
          workflow_id: string;
        };
        Update: {
          created_at?: string;
          form_id?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_form_triggers_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_form_triggers_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_run_steps: {
        Row: {
          error_message: string | null;
          finished_at: string | null;
          id: string;
          input: Json | null;
          node_id: string;
          node_type: string;
          output: Json | null;
          run_id: string;
          started_at: string;
          status: string;
        };
        Insert: {
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          input?: Json | null;
          node_id: string;
          node_type: string;
          output?: Json | null;
          run_id: string;
          started_at?: string;
          status: string;
        };
        Update: {
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          input?: Json | null;
          node_id?: string;
          node_type?: string;
          output?: Json | null;
          run_id?: string;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_run_steps_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "workflow_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      workflow_runs: {
        Row: {
          attempt: number;
          claimed_at: string | null;
          created_at: string;
          definition_snapshot: Json;
          error_code: string | null;
          error_message: string | null;
          finished_at: string | null;
          form_id: string;
          id: string;
          is_test: boolean;
          response_id: string;
          started_at: string | null;
          status: string;
          trigger_type: string;
          workflow_id: string;
        };
        Insert: {
          attempt?: number;
          claimed_at?: string | null;
          created_at?: string;
          definition_snapshot: Json;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          form_id: string;
          id?: string;
          is_test?: boolean;
          response_id: string;
          started_at?: string | null;
          status?: string;
          trigger_type?: string;
          workflow_id: string;
        };
        Update: {
          attempt?: number;
          claimed_at?: string | null;
          created_at?: string;
          definition_snapshot?: Json;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          form_id?: string;
          id?: string;
          is_test?: boolean;
          response_id?: string;
          started_at?: string | null;
          status?: string;
          trigger_type?: string;
          workflow_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflow_runs_form_id_fkey";
            columns: ["form_id"];
            isOneToOne: false;
            referencedRelation: "forms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_response_id_fkey";
            columns: ["response_id"];
            isOneToOne: false;
            referencedRelation: "responses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey";
            columns: ["workflow_id"];
            isOneToOne: false;
            referencedRelation: "workflows";
            referencedColumns: ["id"];
          },
        ];
      };
      workflows: {
        Row: {
          created_at: string;
          created_by: string | null;
          definition: Json;
          id: string;
          name: string;
          schema_version: number;
          status: string;
          updated_at: string;
          webhook_secret: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          definition: Json;
          id?: string;
          name: string;
          schema_version?: number;
          status?: string;
          updated_at?: string;
          webhook_secret?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          definition?: Json;
          id?: string;
          name?: string;
          schema_version?: number;
          status?: string;
          updated_at?: string;
          webhook_secret?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workflows_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          limits: Json;
          name: string;
          owner_id: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          limits?: Json;
          name: string;
          owner_id: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          limits?: Json;
          name?: string;
          owner_id?: string;
          slug?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_rate_limit: {
        Args: { p_key: string; p_window_start: string };
        Returns: number;
      };
      is_workspace_member: {
        Args: {
          min_role?: Database["public"]["Enums"]["workspace_role"];
          target_workspace_id: string;
        };
        Returns: boolean;
      };
      publish_form: {
        Args: {
          p_expected_revision: number;
          p_form_id: string;
          p_user_id: string;
        };
        Returns: {
          version_id: string;
          version_number: number;
        }[];
      };
      purge_old_ai_generations: { Args: never; Returns: undefined };
      purge_old_rate_limits: { Args: never; Returns: undefined };
      purge_stale_form_sessions: { Args: never; Returns: undefined };
      save_form_draft: {
        Args: {
          p_definition: Json;
          p_expected_revision: number;
          p_form_id: string;
        };
        Returns: {
          draft_revision: number;
        }[];
      };
    };
    Enums: {
      form_event_type:
        | "view"
        | "start"
        | "page_view"
        | "field_interaction"
        | "submit_attempt"
        | "submit"
        | "abandon";
      form_session_status: "started" | "completed" | "abandoned";
      form_status: "draft" | "published" | "paused" | "archived";
      response_status: "completed" | "test" | "spam" | "archived";
      workspace_role: "owner" | "editor" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      form_event_type: [
        "view",
        "start",
        "page_view",
        "field_interaction",
        "submit_attempt",
        "submit",
        "abandon",
      ],
      form_session_status: ["started", "completed", "abandoned"],
      form_status: ["draft", "published", "paused", "archived"],
      response_status: ["completed", "test", "spam", "archived"],
      workspace_role: ["owner", "editor", "viewer"],
    },
  },
} as const;
