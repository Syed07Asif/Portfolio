export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          display_order: number
          document_url: string | null
          external_link: string | null
          id: string
          image_url: string | null
          organization: string | null
          published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          display_order?: number
          document_url?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          organization?: string | null
          published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          display_order?: number
          document_url?: string | null
          external_link?: string | null
          id?: string
          image_url?: string | null
          organization?: string | null
          published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string | null
          category: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string
          display_order: number
          excerpt: string | null
          id: string
          published_at: string | null
          reading_time: number | null
          slug: string
          status: Database["public"]["Enums"]["blog_status"]
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_order?: number
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          slug: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          category?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_order?: number
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      certifications: {
        Row: {
          certificate_file_url: string | null
          created_at: string
          credential_id: string | null
          credential_url: string | null
          description: string | null
          display_order: number
          expiration_date: string | null
          id: string
          issue_date: string | null
          issuing_organization: string
          name: string
          organization_logo_url: string | null
          published: boolean
          updated_at: string
        }
        Insert: {
          certificate_file_url?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          display_order?: number
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization: string
          name: string
          organization_logo_url?: string | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          certificate_file_url?: string | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          description?: string | null
          display_order?: number
          expiration_date?: string | null
          id?: string
          issue_date?: string | null
          issuing_organization?: string
          name?: string
          organization_logo_url?: string | null
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contact_links: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          label: string
          published: boolean
          type: Database["public"]["Enums"]["contact_type"]
          updated_at: string
          url: string | null
          value: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          label: string
          published?: boolean
          type: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
          url?: string | null
          value: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          label?: string
          published?: boolean
          type?: Database["public"]["Enums"]["contact_type"]
          updated_at?: string
          url?: string | null
          value?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          created_at: string
          degree: string
          description: string | null
          display_order: number
          end_date: string | null
          field_of_study: string | null
          grade: string | null
          id: string
          institution: string
          institution_logo_url: string | null
          link_url: string | null
          published: boolean
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          degree: string
          description?: string | null
          display_order?: number
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution: string
          institution_logo_url?: string | null
          link_url?: string | null
          published?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          degree?: string
          description?: string | null
          display_order?: number
          end_date?: string | null
          field_of_study?: string | null
          grade?: string | null
          id?: string
          institution?: string
          institution_logo_url?: string | null
          link_url?: string | null
          published?: boolean
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      experience: {
        Row: {
          company: string
          company_logo_url: string | null
          created_at: string
          description: string | null
          display_order: number
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          link_url: string | null
          location: string | null
          published: boolean
          responsibilities: string[] | null
          role: string
          start_date: string
          technologies: string[] | null
          updated_at: string
        }
        Insert: {
          company: string
          company_logo_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          link_url?: string | null
          location?: string | null
          published?: boolean
          responsibilities?: string[] | null
          role: string
          start_date: string
          technologies?: string[] | null
          updated_at?: string
        }
        Update: {
          company?: string
          company_logo_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          link_url?: string | null
          location?: string | null
          published?: boolean
          responsibilities?: string[] | null
          role?: string
          start_date?: string
          technologies?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          availability_status: string | null
          avatar_url: string | null
          created_at: string
          current_role: string | null
          full_name: string
          headline: string | null
          id: string
          is_singleton: boolean
          location: string | null
          long_bio: string | null
          short_bio: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string
          current_role?: string | null
          full_name: string
          headline?: string | null
          id?: string
          is_singleton?: boolean
          location?: string | null
          long_bio?: string | null
          short_bio?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          availability_status?: string | null
          avatar_url?: string | null
          created_at?: string
          current_role?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          is_singleton?: boolean
          location?: string | null
          long_bio?: string | null
          short_bio?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_features: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_features_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_media: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          display_order: number
          file_url: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          project_id: string
          storage_path: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          file_url: string
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          project_id: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          display_order?: number
          file_url?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          project_id?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_media_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_technologies: {
        Row: {
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_technologies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cover_image_url: string | null
          created_at: string
          demo_url: string | null
          description: string | null
          display_order: number
          end_date: string | null
          featured: boolean
          github_url: string | null
          id: string
          logo_url: string | null
          name: string
          problem_statement: string | null
          published: boolean
          purpose: string | null
          short_description: string | null
          slug: string
          solution: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          problem_statement?: string | null
          published?: boolean
          purpose?: string | null
          short_description?: string | null
          slug: string
          solution?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          display_order?: number
          end_date?: string | null
          featured?: boolean
          github_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          problem_statement?: string | null
          published?: boolean
          purpose?: string | null
          short_description?: string | null
          slug?: string
          solution?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          file_url: string
          id: string
          is_active: boolean
          storage_path: string | null
          updated_at: string
          uploaded_at: string
          version_label: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          is_active?: boolean
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          version_label?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          is_active?: boolean
          storage_path?: string | null
          updated_at?: string
          uploaded_at?: string
          version_label?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          analytics_enabled: boolean
          created_at: string
          feature_flags: Json
          id: string
          is_singleton: boolean
          meta_description: string | null
          og_image_url: string | null
          primary_nav: Json
          site_title: string
          updated_at: string
        }
        Insert: {
          analytics_enabled?: boolean
          created_at?: string
          feature_flags?: Json
          id?: string
          is_singleton?: boolean
          meta_description?: string | null
          og_image_url?: string | null
          primary_nav?: Json
          site_title: string
          updated_at?: string
        }
        Update: {
          analytics_enabled?: boolean
          created_at?: string
          feature_flags?: Json
          id?: string
          is_singleton?: boolean
          meta_description?: string | null
          og_image_url?: string | null
          primary_nav?: Json
          site_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          created_at: string
          display_order: number
          icon: string | null
          id: string
          name: string
          proficiency: number | null
          published: boolean
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name: string
          proficiency?: number | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number
          icon?: string | null
          id?: string
          name?: string
          proficiency?: number | null
          published?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_site_settings: {
        Row: {
          analytics_enabled: boolean | null
          feature_flags: Json | null
          meta_description: string | null
          og_image_url: string | null
          primary_nav: Json | null
          site_title: string | null
        }
        Insert: {
          analytics_enabled?: boolean | null
          feature_flags?: Json | null
          meta_description?: string | null
          og_image_url?: string | null
          primary_nav?: Json | null
          site_title?: string | null
        }
        Update: {
          analytics_enabled?: boolean | null
          feature_flags?: Json | null
          meta_description?: string | null
          og_image_url?: string | null
          primary_nav?: Json | null
          site_title?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
      set_active_resume: { Args: { resume_id: string }; Returns: undefined }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      blog_status: "draft" | "published"
      contact_type:
        | "email"
        | "linkedin"
        | "github"
        | "whatsapp"
        | "twitter"
        | "other"
      media_type: "image" | "video" | "gif" | "diagram" | "document"
      project_status: "planned" | "in_progress" | "completed" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      blog_status: ["draft", "published"],
      contact_type: [
        "email",
        "linkedin",
        "github",
        "whatsapp",
        "twitter",
        "other",
      ],
      media_type: ["image", "video", "gif", "diagram", "document"],
      project_status: ["planned", "in_progress", "completed", "archived"],
    },
  },
} as const

