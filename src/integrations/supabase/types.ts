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
      books: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          current_page: number
          description: string
          finished_reading_at: string | null
          genre: string
          goodreads_id: string | null
          id: string
          isbn: string | null
          moods: string[]
          pages: number
          reading_cycle: number
          reading_speed_days: number | null
          series_index: number | null
          series_name: string | null
          started_reading_at: string | null
          status: Database["public"]["Enums"]["book_status"]
          title: string
          updated_at: string
          user_id: string
          user_rating: number | null
          user_review: string | null
        }
        Insert: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          description?: string
          finished_reading_at?: string | null
          genre?: string
          goodreads_id?: string | null
          id?: string
          isbn?: string | null
          moods?: string[]
          pages?: number
          reading_cycle?: number
          reading_speed_days?: number | null
          series_index?: number | null
          series_name?: string | null
          started_reading_at?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          title: string
          updated_at?: string
          user_id: string
          user_rating?: number | null
          user_review?: string | null
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          current_page?: number
          description?: string
          finished_reading_at?: string | null
          genre?: string
          goodreads_id?: string | null
          id?: string
          isbn?: string | null
          moods?: string[]
          pages?: number
          reading_cycle?: number
          reading_speed_days?: number | null
          series_index?: number | null
          series_name?: string | null
          started_reading_at?: string | null
          status?: Database["public"]["Enums"]["book_status"]
          title?: string
          updated_at?: string
          user_id?: string
          user_rating?: number | null
          user_review?: string | null
        }
        Relationships: []
      }
      completed_readings: {
        Row: {
          book_id: string
          cycle: number
          finished_at: string | null
          started_at: string | null
          streak_day: string | null
        }
        Insert: {
          book_id: string
          cycle: number
          finished_at?: string | null
          started_at?: string | null
          streak_day?: string | null
        }
        Update: {
          book_id?: string
          cycle?: number
          finished_at?: string | null
          started_at?: string | null
          streak_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "completed_readings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      courtesy_accounts: {
        Row: {
          active: boolean
          created_at: string
          email: string
          granted_at: string
          granted_by: string | null
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          granted_at?: string
          granted_by?: string | null
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courtesy_accounts_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          status: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      memberships: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          is_paid: boolean
          paid_at: string | null
          payment_source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          is_paid?: boolean
          paid_at?: string | null
          payment_source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          is_paid?: boolean
          paid_at?: string | null
          payment_source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          onboarding_finished_at: string | null
          reading_goal: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          onboarding_finished_at?: string | null
          reading_goal?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          onboarding_finished_at?: string | null
          reading_goal?: number
          updated_at?: string
        }
        Relationships: []
      }
      reader_ai_usage: {
        Row: {
          requests: number
          user_id: string
          window_start: string
        }
        Insert: {
          requests?: number
          user_id: string
          window_start?: string
        }
        Update: {
          requests?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      reader_bingo_progress: {
        Row: {
          board_id: string
          book_id: string | null
          cell_index: number
          completed_at: string | null
          completed_cycle: number | null
          user_id: string
        }
        Insert: {
          board_id: string
          book_id?: string | null
          cell_index: number
          completed_at?: string | null
          completed_cycle?: number | null
          user_id: string
        }
        Update: {
          board_id?: string
          book_id?: string | null
          cell_index?: number
          completed_at?: string | null
          completed_cycle?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_bingo_progress_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "reader_bingos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_bingo_progress_book_id_completed_cycle_fkey"
            columns: ["book_id", "completed_cycle"]
            isOneToOne: false
            referencedRelation: "completed_readings"
            referencedColumns: ["book_id", "cycle"]
          },
          {
            foreignKeyName: "reader_bingo_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_bingos: {
        Row: {
          activated_at: string | null
          allow_reuse: boolean
          cells: Json
          created_at: string
          ends_on: string | null
          id: string
          purpose: string
          shared_source_id: string | null
          size: number
          starts_on: string | null
          state: string
          title: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          allow_reuse?: boolean
          cells: Json
          created_at?: string
          ends_on?: string | null
          id?: string
          purpose?: string
          shared_source_id?: string | null
          size?: number
          starts_on?: string | null
          state?: string
          title: string
          user_id?: string
        }
        Update: {
          activated_at?: string | null
          allow_reuse?: boolean
          cells?: Json
          created_at?: string
          ends_on?: string | null
          id?: string
          purpose?: string
          shared_source_id?: string | null
          size?: number
          starts_on?: string | null
          state?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_bingos_shared_source_id_fkey"
            columns: ["shared_source_id"]
            isOneToOne: false
            referencedRelation: "reader_shares"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_blocks: {
        Row: {
          blocked_id: string
          user_id: string
        }
        Insert: {
          blocked_id: string
          user_id?: string
        }
        Update: {
          blocked_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_calendar_entries: {
        Row: {
          author: string
          calendar_id: string
          catalog_id: string
          cover_url: string | null
          description: string
          isbn: string | null
          opened_at: string | null
          saved_wish_id: string | null
          slot: number
          task: string
          title: string
        }
        Insert: {
          author: string
          calendar_id: string
          catalog_id: string
          cover_url?: string | null
          description?: string
          isbn?: string | null
          opened_at?: string | null
          saved_wish_id?: string | null
          slot: number
          task?: string
          title: string
        }
        Update: {
          author?: string
          calendar_id?: string
          catalog_id?: string
          cover_url?: string | null
          description?: string
          isbn?: string | null
          opened_at?: string | null
          saved_wish_id?: string | null
          slot?: number
          task?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_calendar_entries_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "reader_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_calendar_entries_saved_wish_id_fkey"
            columns: ["saved_wish_id"]
            isOneToOne: false
            referencedRelation: "reader_wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_calendars: {
        Row: {
          context: string
          id: string
          kind: string
          user_id: string
          year: number
        }
        Insert: {
          context?: string
          id?: string
          kind: string
          user_id: string
          year: number
        }
        Update: {
          context?: string
          id?: string
          kind?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      reader_club_invites: {
        Row: {
          club_id: string
          user_id: string
        }
        Insert: {
          club_id: string
          user_id: string
        }
        Update: {
          club_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_club_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reader_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_club_members: {
        Row: {
          club_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          club_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          club_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reader_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_clubs: {
        Row: {
          description: string
          id: string
          name: string
          owner_id: string
          timezone: string
        }
        Insert: {
          description?: string
          id?: string
          name: string
          owner_id: string
          timezone?: string
        }
        Update: {
          description?: string
          id?: string
          name?: string
          owner_id?: string
          timezone?: string
        }
        Relationships: []
      }
      reader_conversations: {
        Row: {
          answer: string
          book_id: string
          created_at: string
          id: string
          question: string
          user_id: string
        }
        Insert: {
          answer: string
          book_id: string
          created_at?: string
          id?: string
          question: string
          user_id?: string
        }
        Update: {
          answer?: string
          book_id?: string
          created_at?: string
          id?: string
          question?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_conversations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_feelings: {
        Row: {
          book_id: string
          immersion: number | null
          tags: string[]
          tears: number | null
          tier: string | null
          tier_rank: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          immersion?: number | null
          tags?: string[]
          tears?: number | null
          tier?: string | null
          tier_rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          book_id?: string
          immersion?: number | null
          tags?: string[]
          tears?: number | null
          tier?: string | null
          tier_rank?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_feelings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_friendships: {
        Row: {
          recipient: string
          requester: string
          state: string
        }
        Insert: {
          recipient: string
          requester: string
          state?: string
        }
        Update: {
          recipient?: string
          requester?: string
          state?: string
        }
        Relationships: []
      }
      reader_joint_comments: {
        Row: {
          body: string
          chapter: number
          created_at: string
          id: string
          reading_id: string
          user_id: string
        }
        Insert: {
          body: string
          chapter: number
          created_at?: string
          id?: string
          reading_id: string
          user_id?: string
        }
        Update: {
          body?: string
          chapter?: number
          created_at?: string
          id?: string
          reading_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_joint_comments_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "reader_joint_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_joint_participants: {
        Row: {
          book_id: string
          joined_at: string
          reading_id: string
          user_id: string
        }
        Insert: {
          book_id: string
          joined_at?: string
          reading_id: string
          user_id: string
        }
        Update: {
          book_id?: string
          joined_at?: string
          reading_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_joint_participants_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_joint_participants_reading_id_fkey"
            columns: ["reading_id"]
            isOneToOne: false
            referencedRelation: "reader_joint_readings"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_joint_readings: {
        Row: {
          author: string
          chapters: number
          club_id: string
          created_at: string
          goal: string
          id: string
          isbn: string | null
          title: string
        }
        Insert: {
          author: string
          chapters?: number
          club_id: string
          created_at?: string
          goal?: string
          id?: string
          isbn?: string | null
          title: string
        }
        Update: {
          author?: string
          chapters?: number
          club_id?: string
          created_at?: string
          goal?: string
          id?: string
          isbn?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_joint_readings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reader_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_list_items: {
        Row: {
          book_id: string | null
          id: string
          list_id: string
          position: number
          user_id: string
          wish_id: string | null
        }
        Insert: {
          book_id?: string | null
          id?: string
          list_id: string
          position?: number
          user_id?: string
          wish_id?: string | null
        }
        Update: {
          book_id?: string | null
          id?: string
          list_id?: string
          position?: number
          user_id?: string
          wish_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reader_list_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_list_items_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "reader_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_list_items_wish_id_fkey"
            columns: ["wish_id"]
            isOneToOne: false
            referencedRelation: "reader_wishes"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_lists: {
        Row: {
          annual_year: number | null
          created_at: string
          description: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          annual_year?: number | null
          created_at?: string
          description?: string
          id?: string
          name: string
          user_id?: string
        }
        Update: {
          annual_year?: number | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_notes: {
        Row: {
          book_id: string
          chapter: string
          content: string
          created_at: string
          favorite: boolean
          feeling_tags: string[]
          id: string
          kind: string
          page: number | null
          reflection: string
          tags: string[]
          user_id: string
        }
        Insert: {
          book_id: string
          chapter?: string
          content: string
          created_at?: string
          favorite?: boolean
          feeling_tags?: string[]
          id?: string
          kind?: string
          page?: number | null
          reflection?: string
          tags?: string[]
          user_id?: string
        }
        Update: {
          book_id?: string
          chapter?: string
          content?: string
          created_at?: string
          favorite?: boolean
          feeling_tags?: string[]
          id?: string
          kind?: string
          page?: number | null
          reflection?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_preferences: {
        Row: {
          moods: string[]
          onboarding_version: number
          pace: string
          updated_at: string
          user_id: string
        }
        Insert: {
          moods?: string[]
          onboarding_version?: number
          pace?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          moods?: string[]
          onboarding_version?: number
          pace?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          status: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          status?: string
          target_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          status?: string
          target_id?: string
          user_id?: string
        }
        Relationships: []
      }
      reader_shares: {
        Row: {
          club_id: string | null
          id: string
          kind: string
          source_id: string
          user_id: string
          visibility: string
        }
        Insert: {
          club_id?: string | null
          id?: string
          kind: string
          source_id: string
          user_id?: string
          visibility?: string
        }
        Update: {
          club_id?: string | null
          id?: string
          kind?: string
          source_id?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_shares_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reader_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_social_profiles: {
        Row: {
          avatar_path: string | null
          bio: string
          club_id: string | null
          cover_path: string | null
          handle: string
          name: string
          user_id: string
          visibility: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string
          club_id?: string | null
          cover_path?: string | null
          handle: string
          name?: string
          user_id?: string
          visibility?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string
          club_id?: string | null
          cover_path?: string | null
          handle?: string
          name?: string
          user_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_profile_club_fk"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "reader_clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_timer_receipts: {
        Row: {
          book_id: string
          cycle: number
          id: string
          minutes: number
          saved_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          cycle: number
          id: string
          minutes: number
          saved_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          cycle?: number
          id?: string
          minutes?: number
          saved_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_timer_receipts_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reader_wishes: {
        Row: {
          author: string
          cover_url: string | null
          created_at: string
          description: string
          id: string
          isbn: string | null
          title: string
          user_id: string
        }
        Insert: {
          author?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          isbn?: string | null
          title: string
          user_id?: string
        }
        Update: {
          author?: string
          cover_url?: string | null
          created_at?: string
          description?: string
          id?: string
          isbn?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          book_id: string
          created_at: string
          cycle: number
          day: string
          from_page: number
          id: string
          minutes: number | null
          note: string
          to_page: number
        }
        Insert: {
          book_id: string
          created_at?: string
          cycle: number
          day: string
          from_page: number
          id?: string
          minutes?: number | null
          note?: string
          to_page: number
        }
        Update: {
          book_id?: string
          created_at?: string
          cycle?: number
          day?: string
          from_page?: number
          id?: string
          minutes?: number | null
          note?: string
          to_page?: number
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advent_unlocked: {
        Args: { p_day: string; p_slot: number; p_year: number }
        Returns: boolean
      }
      claim_koa_request: { Args: never; Returns: undefined }
      close_reader_session: {
        Args: {
          p_book: string
          p_cycle: number
          p_day: string
          p_finish: boolean
          p_from: number
          p_id: string
          p_minutes: number
          p_note: string
          p_to: number
          p_zone: string
        }
        Returns: undefined
      }
      finish_active_book: {
        Args: { p_book: string; p_cycle: number; p_zone: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_goodreads: { Args: { p_rows: Json }; Returns: number }
      install_reader_candidates: {
        Args: { p_calendar: string; p_entries: Json; p_user: string }
        Returns: undefined
      }
      reader_blocked: { Args: { a: string; b: string }; Returns: boolean }
      reader_can_view: {
        Args: { c: string; owner_id: string; v: string }
        Returns: boolean
      }
      reader_chapter_access: {
        Args: { p_chapter: number; p_reading: string }
        Returns: boolean
      }
      reader_club_action: {
        Args: {
          p_action: string
          p_club?: string
          p_description?: string
          p_handle?: string
          p_name?: string
          p_zone?: string
        }
        Returns: string
      }
      reader_club_member: { Args: { c: string; u: string }; Returns: boolean }
      reader_connections: { Args: never; Returns: Json }
      reader_copy_bingo: { Args: { p_share: string }; Returns: string }
      reader_friend_action: {
        Args: { p_action: string; p_handle: string }
        Returns: undefined
      }
      reader_identity: {
        Args: { p_author: string; p_title: string }
        Returns: string
      }
      reader_isbn: { Args: { p_isbn: string }; Returns: string }
      reader_joint_action: {
        Args: {
          p_action: string
          p_book?: string
          p_chapters?: number
          p_club?: string
          p_goal?: string
          p_reading?: string
        }
        Returns: string
      }
      reader_joint_percent: {
        Args: { p_reading: string; p_user: string }
        Returns: number
      }
      reader_joint_summary: { Args: { p_reading: string }; Returns: Json }
      reader_share: {
        Args: {
          p_club?: string
          p_kind: string
          p_source: string
          p_visibility: string
        }
        Returns: string
      }
      reader_share_payload: { Args: { p_id: string }; Returns: Json }
      record_reading: {
        Args: {
          p_book: string
          p_cycle: number
          p_day: string
          p_from: number
          p_minutes: number
          p_note: string
          p_to: number
          p_zone: string
        }
        Returns: undefined
      }
      reorder_reader_list: {
        Args: { p_ids: string[]; p_list: string }
        Returns: undefined
      }
      reveal_reader_window: {
        Args: { p_calendar: string; p_slot: number; p_zone: string }
        Returns: Json
      }
      revise_session: {
        Args: {
          p_day: string
          p_id: string
          p_minutes: number
          p_note: string
          p_remove: boolean
          p_zone: string
        }
        Returns: undefined
      }
      save_reader_discovery: {
        Args: { p_calendar: string; p_slot: number }
        Returns: string
      }
      set_bingo_cell: {
        Args: {
          p_board: string
          p_book: string
          p_complete: boolean
          p_index: number
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      book_status: "TBR" | "READING" | "READ" | "PAUSED" | "ABANDONED"
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
      app_role: ["admin", "user"],
      book_status: ["TBR", "READING", "READ", "PAUSED", "ABANDONED"],
    },
  },
} as const
