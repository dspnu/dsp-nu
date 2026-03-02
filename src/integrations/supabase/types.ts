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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      alumni: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          first_name: string
          graduation_year: number | null
          id: string
          industry: string | null
          job_title: string | null
          last_name: string
          linkedin_url: string | null
          location: string | null
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          graduation_year?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_name: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          graduation_year?: number | null
          id?: string
          industry?: string | null
          job_title?: string | null
          last_name?: string
          linkedin_url?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      approved_coffee_chat_members: {
        Row: {
          big: string | null
          created_at: string
          dsp_position: string | null
          family: string | null
          first_name: string
          fun_facts: string | null
          grand_big: string | null
          hobbies_interests: string | null
          hometown: string | null
          id: string
          internships_experiences: string | null
          last_name: string
          littles: string | null
          majors: string | null
          minors: string | null
          osu_email: string | null
          osu_involvements: string | null
          pledge_class: string | null
          school_year: string | null
          state: string | null
          uploaded_by: string | null
        }
        Insert: {
          big?: string | null
          created_at?: string
          dsp_position?: string | null
          family?: string | null
          first_name: string
          fun_facts?: string | null
          grand_big?: string | null
          hobbies_interests?: string | null
          hometown?: string | null
          id?: string
          internships_experiences?: string | null
          last_name: string
          littles?: string | null
          majors?: string | null
          minors?: string | null
          osu_email?: string | null
          osu_involvements?: string | null
          pledge_class?: string | null
          school_year?: string | null
          state?: string | null
          uploaded_by?: string | null
        }
        Update: {
          big?: string | null
          created_at?: string
          dsp_position?: string | null
          family?: string | null
          first_name?: string
          fun_facts?: string | null
          grand_big?: string | null
          hobbies_interests?: string | null
          hometown?: string | null
          id?: string
          internships_experiences?: string | null
          last_name?: string
          littles?: string | null
          majors?: string | null
          minors?: string | null
          osu_email?: string | null
          osu_involvements?: string | null
          pledge_class?: string | null
          school_year?: string | null
          state?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      attendance: {
        Row: {
          checked_in_at: string
          checked_in_by: string | null
          event_id: string
          excuse_notes: string | null
          id: string
          is_excused: boolean
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_id: string
          excuse_notes?: string | null
          id?: string
          is_excused?: boolean
          user_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string | null
          event_id?: string
          excuse_notes?: string | null
          id?: string
          is_excused?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      chapter_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      coffee_chat_milestones: {
        Row: {
          created_at: string
          created_by: string
          deadline: string
          id: string
          target_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline: string
          id?: string
          target_count: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string
          id?: string
          target_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      coffee_chats: {
        Row: {
          chat_date: string
          confirmed_by: string | null
          created_at: string
          id: string
          initiator_id: string
          notes: string | null
          partner_id: string
          proof_url: string | null
          status: Database["public"]["Enums"]["coffee_chat_status"]
          updated_at: string
        }
        Insert: {
          chat_date: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          initiator_id: string
          notes?: string | null
          partner_id: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["coffee_chat_status"]
          updated_at?: string
        }
        Update: {
          chat_date?: string
          confirmed_by?: string | null
          created_at?: string
          id?: string
          initiator_id?: string
          notes?: string | null
          partner_id?: string
          proof_url?: string | null
          status?: Database["public"]["Enums"]["coffee_chat_status"]
          updated_at?: string
        }
        Relationships: []
      }
      dues_payments: {
        Row: {
          amount: number
          created_by: string | null
          id: string
          notes: string | null
          paid_at: string
          semester: string
          user_id: string
        }
        Insert: {
          amount: number
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          semester: string
          user_id: string
        }
        Update: {
          amount?: number
          created_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string
          semester?: string
          user_id?: string
        }
        Relationships: []
      }
      eop_candidates: {
        Row: {
          attachments: string[] | null
          created_at: string
          eligible_voters: number | null
          email: string | null
          first_name: string
          id: string
          interview_score: number | null
          last_name: string
          notes: string | null
          phone: string | null
          picture_url: string | null
          r1_pu: string | null
          r2_pu: string | null
          tu_td: number | null
          updated_at: string
          video_score: number | null
          voting_open: boolean
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          eligible_voters?: number | null
          email?: string | null
          first_name: string
          id?: string
          interview_score?: number | null
          last_name: string
          notes?: string | null
          phone?: string | null
          picture_url?: string | null
          r1_pu?: string | null
          r2_pu?: string | null
          tu_td?: number | null
          updated_at?: string
          video_score?: number | null
          voting_open?: boolean
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          eligible_voters?: number | null
          email?: string | null
          first_name?: string
          id?: string
          interview_score?: number | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          picture_url?: string | null
          r1_pu?: string | null
          r2_pu?: string | null
          tu_td?: number | null
          updated_at?: string
          video_score?: number | null
          voting_open?: boolean
        }
        Relationships: []
      }
      eop_ready: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eop_ready_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "eop_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      eop_votes: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          vote: Database["public"]["Enums"]["eop_vote"]
          voter_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          vote: Database["public"]["Enums"]["eop_vote"]
          voter_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          vote?: Database["public"]["Enums"]["eop_vote"]
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "eop_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "eop_candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendance_open: boolean
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          is_required: boolean
          location: string | null
          organizer_id: string | null
          points_value: number
          qr_code: string | null
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          attendance_open?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_required?: boolean
          location?: string | null
          organizer_id?: string | null
          points_value?: number
          qr_code?: string | null
          start_time: string
          title: string
          updated_at?: string
        }
        Update: {
          attendance_open?: boolean
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_required?: boolean
          location?: string | null
          organizer_id?: string | null
          points_value?: number
          qr_code?: string | null
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      job_bookmarks: {
        Row: {
          created_at: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          apply_url: string | null
          company: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          is_approved: boolean
          job_type: Database["public"]["Enums"]["job_type"]
          location: string | null
          posted_by: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          apply_url?: string | null
          company: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          posted_by?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          apply_url?: string | null
          company?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          is_approved?: boolean
          job_type?: Database["public"]["Enums"]["job_type"]
          location?: string | null
          posted_by?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          coffee_chat_notifications: boolean
          created_at: string
          event_notifications: boolean
          id: string
          job_board_notifications: boolean
          push_enabled: boolean
          service_hours_notifications: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          coffee_chat_notifications?: boolean
          created_at?: string
          event_notifications?: boolean
          id?: string
          job_board_notifications?: boolean
          push_enabled?: boolean
          service_hours_notifications?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          coffee_chat_notifications?: boolean
          created_at?: string
          event_notifications?: boolean
          id?: string
          job_board_notifications?: boolean
          push_enabled?: boolean
          service_hours_notifications?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pdp_assignments: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          due_date: string
          id: string
          module_id: string | null
          submission_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          due_date: string
          id?: string
          module_id?: string | null
          submission_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string
          id?: string
          module_id?: string | null
          submission_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdp_assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "pdp_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      pdp_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdp_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "pdp_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pdp_modules: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pdp_resources: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string
          module_id: string | null
          title: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          module_id?: string | null
          title: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          module_id?: string | null
          title?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pdp_resources_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "pdp_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      pdp_submissions: {
        Row: {
          assignment_id: string
          content: string | null
          created_at: string
          file_urls: string[] | null
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          content?: string | null
          created_at?: string
          file_urls?: string[] | null
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          content?: string | null
          created_at?: string
          file_urls?: string[] | null
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdp_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "pdp_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      points_ledger: {
        Row: {
          category: Database["public"]["Enums"]["event_category"]
          created_at: string
          event_id: string | null
          granted_by: string | null
          id: string
          points: number
          reason: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_id?: string | null
          granted_by?: string | null
          id?: string
          points: number
          reason: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["event_category"]
          created_at?: string
          event_id?: string | null
          granted_by?: string | null
          id?: string
          points?: number
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          big: string | null
          committees: string[] | null
          created_at: string
          email: string
          family: string | null
          first_name: string
          graduation_year: number | null
          hometown: string | null
          id: string
          last_name: string
          linkedin_url: string | null
          little: string | null
          major: string | null
          phone: string | null
          pledge_class: string | null
          positions: string[] | null
          status: Database["public"]["Enums"]["member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          big?: string | null
          committees?: string[] | null
          created_at?: string
          email: string
          family?: string | null
          first_name?: string
          graduation_year?: number | null
          hometown?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          little?: string | null
          major?: string | null
          phone?: string | null
          pledge_class?: string | null
          positions?: string[] | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          big?: string | null
          committees?: string[] | null
          created_at?: string
          email?: string
          family?: string | null
          first_name?: string
          graduation_year?: number | null
          hometown?: string | null
          id?: string
          last_name?: string
          linkedin_url?: string | null
          little?: string | null
          major?: string | null
          phone?: string | null
          pledge_class?: string | null
          positions?: string[] | null
          status?: Database["public"]["Enums"]["member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_big_fkey"
            columns: ["big"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_little_fkey"
            columns: ["little"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string | null
          folder: string
          id: string
          is_officer_only: boolean
          title: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string
          id?: string
          is_officer_only?: boolean
          title: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          folder?: string
          id?: string
          is_officer_only?: boolean
          title?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      service_hours: {
        Row: {
          created_at: string
          description: string
          hours: number
          id: string
          service_date: string
          updated_at: string
          user_id: string
          verified: boolean
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          description: string
          hours: number
          id?: string
          service_date: string
          updated_at?: string
          user_id: string
          verified?: boolean
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          hours?: number
          id?: string
          service_date?: string
          updated_at?: string
          user_id?: string
          verified?: boolean
          verified_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_officer: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "officer" | "member" | "developer"
      coffee_chat_status: "emailed" | "scheduled" | "completed"
      eop_vote: "yes" | "no" | "abstain"
      event_category:
        | "chapter"
        | "rush"
        | "fundraising"
        | "service"
        | "brotherhood"
        | "professionalism"
        | "dei"
      job_type: "internship" | "full_time" | "part_time" | "contract"
      member_status: "active" | "alumni" | "new_member" | "pnm" | "inactive"
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
      app_role: ["admin", "officer", "member", "developer"],
      coffee_chat_status: ["emailed", "scheduled", "completed"],
      eop_vote: ["yes", "no", "abstain"],
      event_category: [
        "chapter",
        "rush",
        "fundraising",
        "service",
        "brotherhood",
        "professionalism",
        "dei",
      ],
      job_type: ["internship", "full_time", "part_time", "contract"],
      member_status: ["active", "alumni", "new_member", "pnm", "inactive"],
    },
  },
} as const
