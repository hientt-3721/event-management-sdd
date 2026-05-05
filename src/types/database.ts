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
      profiles: {
        Row: {
          id: string
          display_name: string
          avatar_url: string | null
          role: 'attendee' | 'organizer' | 'staff'
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string
          avatar_url?: string | null
          role?: 'attendee' | 'organizer' | 'staff'
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          avatar_url?: string | null
          role?: 'attendee' | 'organizer' | 'staff'
          created_at?: string
        }
      }
      events: {
        Row: {
          id: string
          organizer_id: string
          name: string
          description: string
          start_at: string
          end_at: string
          location: string
          banner_image_url: string | null
          status: 'draft' | 'published' | 'cancelled'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          name: string
          description: string
          start_at: string
          end_at: string
          location: string
          banner_image_url?: string | null
          status?: 'draft' | 'published' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organizer_id?: string
          name?: string
          description?: string
          start_at?: string
          end_at?: string
          location?: string
          banner_image_url?: string | null
          status?: 'draft' | 'published' | 'cancelled'
          created_at?: string
          updated_at?: string
        }
      }
      ticket_types: {
        Row: {
          id: string
          event_id: string
          name: string
          description: string | null
          total_quantity: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          description?: string | null
          total_quantity: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          name?: string
          description?: string | null
          total_quantity?: number
          created_at?: string
        }
      }
      tickets: {
        Row: {
          id: string
          attendee_id: string
          ticket_type_id: string
          status: 'active' | 'used' | 'cancelled'
          registered_at: string
          cancelled_at: string | null
        }
        Insert: {
          id?: string
          attendee_id: string
          ticket_type_id: string
          status?: 'active' | 'used' | 'cancelled'
          registered_at?: string
          cancelled_at?: string | null
        }
        Update: {
          id?: string
          attendee_id?: string
          ticket_type_id?: string
          status?: 'active' | 'used' | 'cancelled'
          registered_at?: string
          cancelled_at?: string | null
        }
      }
      check_ins: {
        Row: {
          id: string
          ticket_id: string
          scanned_at: string
          scanned_by: string | null
        }
        Insert: {
          id?: string
          ticket_id: string
          scanned_at?: string
          scanned_by?: string | null
        }
        Update: {
          id?: string
          ticket_id?: string
          scanned_at?: string
          scanned_by?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          attendee_id: string
          event_id: string
          ticket_id: string | null
          type: 'reminder_24h' | 'reminder_1h' | 'cancellation'
          scheduled_at: string
          sent_at: string | null
          status: 'pending' | 'sent' | 'failed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          attendee_id: string
          event_id: string
          ticket_id?: string | null
          type: 'reminder_24h' | 'reminder_1h' | 'cancellation'
          scheduled_at: string
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          attendee_id?: string
          event_id?: string
          ticket_id?: string | null
          type?: 'reminder_24h' | 'reminder_1h' | 'cancellation'
          scheduled_at?: string
          sent_at?: string | null
          status?: 'pending' | 'sent' | 'failed' | 'cancelled'
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      register_ticket: {
        Args: { p_attendee_id: string; p_ticket_type_id: string }
        Returns: string
      }
      validate_and_check_in: {
        Args: { p_ticket_id: string; p_staff_id: string }
        Returns: Json
      }
    }
    Enums: {
      user_role: 'attendee' | 'organizer' | 'staff'
      event_status: 'draft' | 'published' | 'cancelled'
      ticket_status: 'active' | 'used' | 'cancelled'
      notification_type: 'reminder_24h' | 'reminder_1h' | 'cancellation'
      notification_status: 'pending' | 'sent' | 'failed' | 'cancelled'
    }
  }
}
