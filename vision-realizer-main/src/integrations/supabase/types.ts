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
      academic_years: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_current: boolean
          name: string
          start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_current?: boolean
          name: string
          start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_current?: boolean
          name?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          audience: string
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          published_at: string | null
          target_class_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          target_class_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          published_at?: string | null
          target_class_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      book_loans: {
        Row: {
          book_id: string
          borrower_student_id: string | null
          borrower_teacher_id: string | null
          created_at: string
          due_date: string
          fine_amount: number | null
          id: string
          loan_date: string
          notes: string | null
          return_date: string | null
          status: string
        }
        Insert: {
          book_id: string
          borrower_student_id?: string | null
          borrower_teacher_id?: string | null
          created_at?: string
          due_date: string
          fine_amount?: number | null
          id?: string
          loan_date?: string
          notes?: string | null
          return_date?: string | null
          status?: string
        }
        Update: {
          book_id?: string
          borrower_student_id?: string | null
          borrower_teacher_id?: string | null
          created_at?: string
          due_date?: string
          fine_amount?: number | null
          id?: string
          loan_date?: string
          notes?: string | null
          return_date?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_borrower_student_id_fkey"
            columns: ["borrower_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_loans_borrower_teacher_id_fkey"
            columns: ["borrower_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      class_fees: {
        Row: {
          amount: number | null
          class_id: string
          created_at: string
          fee_type_id: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          class_id: string
          created_at?: string
          fee_type_id: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          class_id?: string
          created_at?: string
          fee_type_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      classes: {
        Row: {
          academic_year_id: string | null
          capacity: number | null
          created_at: string
          grade_id: string | null
          homeroom_teacher_id: string | null
          id: string
          name: string
          room_number: string | null
          section: string | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string
          grade_id?: string | null
          homeroom_teacher_id?: string | null
          id?: string
          name: string
          room_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          capacity?: number | null
          created_at?: string
          grade_id?: string | null
          homeroom_teacher_id?: string | null
          id?: string
          name?: string
          room_number?: string | null
          section?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_homeroom_teacher_fk"
            columns: ["homeroom_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      discipline_records: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string
          id: string
          incident_date: string
          recorded_by: string | null
          severity: Database["public"]["Enums"]["discipline_severity"]
          student_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description: string
          id?: string
          incident_date?: string
          recorded_by?: string | null
          severity?: Database["public"]["Enums"]["discipline_severity"]
          student_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string
          id?: string
          incident_date?: string
          recorded_by?: string | null
          severity?: Database["public"]["Enums"]["discipline_severity"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipline_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          location: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          location?: string | null
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          location?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      exam_results: {
        Row: {
          created_at: string
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number
          recorded_by: string | null
          remarks: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          recorded_by?: string | null
          remarks?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number
          recorded_by?: string | null
          remarks?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string
          duration_minutes: number | null
          exam_date: string
          exam_type: Database["public"]["Enums"]["exam_type"]
          id: string
          name: string
          subject_id: string | null
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          exam_date: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          name: string
          subject_id?: string | null
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          duration_minutes?: number | null
          exam_date?: string
          exam_type?: Database["public"]["Enums"]["exam_type"]
          id?: string
          name?: string
          subject_id?: string | null
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_types: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["fee_frequency"]
          grade_id: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          grade_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          grade_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_types_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          created_at: string
          description: string | null
          id: string
          level: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          level: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          level?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      health_records: {
        Row: {
          allergies: string | null
          blood_group: string | null
          chronic_conditions: string | null
          created_at: string
          id: string
          notes: string | null
          recorded_by: string | null
          student_id: string
          updated_at: string
          vaccinations: string | null
          visit_date: string
        }
        Insert: {
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          student_id: string
          updated_at?: string
          vaccinations?: string | null
          visit_date?: string
        }
        Update: {
          allergies?: string | null
          blood_group?: string | null
          chronic_conditions?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          student_id?: string
          updated_at?: string
          vaccinations?: string | null
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      id_number_settings: {
        Row: {
          entity: string
          next_value: number
          padding: number
          prefix: string
          separator: string
          updated_at: string
        }
        Insert: {
          entity: string
          next_value?: number
          padding?: number
          prefix?: string
          separator?: string
          updated_at?: string
        }
        Update: {
          entity?: string
          next_value?: number
          padding?: number
          prefix?: string
          separator?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          author: string | null
          available_copies: number
          category: string | null
          cover_url: string | null
          created_at: string
          id: string
          isbn: string | null
          publication_year: number | null
          publisher: string | null
          shelf_location: string | null
          status: Database["public"]["Enums"]["book_status"] | null
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author?: string | null
          available_copies?: number
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          status?: Database["public"]["Enums"]["book_status"] | null
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string | null
          available_copies?: number
          category?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          isbn?: string | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          status?: Database["public"]["Enums"]["book_status"] | null
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          address: string | null
          alt_phone: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          national_id: string | null
          occupation: string | null
          phone: string
          relation: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          alt_phone?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          national_id?: string | null
          occupation?: string | null
          phone: string
          relation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          alt_phone?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          national_id?: string | null
          occupation?: string | null
          phone?: string
          relation?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          fee_type_id: string | null
          id: string
          notes: string | null
          paid_amount: number | null
          payment_date: string
          payment_method: string | null
          receipt_number: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          fee_type_id?: string | null
          id?: string
          notes?: string | null
          paid_amount?: number | null
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      report_cards: {
        Row: {
          academic_year_id: string | null
          class_id: string | null
          created_at: string
          id: string
          issued_date: string | null
          obtained_marks: number | null
          percentage: number | null
          rank_in_class: number | null
          remarks: string | null
          student_id: string
          term: Database["public"]["Enums"]["term_type"]
          total_marks: number | null
        }
        Insert: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          issued_date?: string | null
          obtained_marks?: number | null
          percentage?: number | null
          rank_in_class?: number | null
          remarks?: string | null
          student_id: string
          term: Database["public"]["Enums"]["term_type"]
          total_marks?: number | null
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          issued_date?: string | null
          obtained_marks?: number | null
          percentage?: number | null
          rank_in_class?: number | null
          remarks?: string | null
          student_id?: string
          term?: Database["public"]["Enums"]["term_type"]
          total_marks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          deduction: number
          id: string
          net_amount: number
          notes: string | null
          pay_period_month: number
          pay_period_year: number
          payment_date: string
          payment_method: string | null
          recipient_type: string
          recorded_by: string | null
          staff_id: string | null
          status: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deduction?: number
          id?: string
          net_amount?: number
          notes?: string | null
          pay_period_month: number
          pay_period_year: number
          payment_date?: string
          payment_method?: string | null
          recipient_type: string
          recorded_by?: string | null
          staff_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deduction?: number
          id?: string
          net_amount?: number
          notes?: string | null
          pay_period_month?: number
          pay_period_year?: number
          payment_date?: string
          payment_method?: string | null
          recipient_type?: string
          recorded_by?: string | null
          staff_id?: string | null
          status?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      schedules: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room_number: string | null
          start_time: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room_number?: string | null
          start_time: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room_number?: string | null
          start_time?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedules_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          address: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_code: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hire_date: string | null
          id: string
          phone: string | null
          photo_url: string | null
          position: string
          salary: number | null
          status: Database["public"]["Enums"]["employment_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          position: string
          salary?: number | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          phone?: string | null
          photo_url?: string | null
          position?: string
          salary?: number | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      staff_points: {
        Row: {
          created_at: string
          date: string
          id: string
          point_type: string
          points: number
          reason: string
          recipient_type: string
          recorded_by: string | null
          staff_id: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          point_type: string
          points?: number
          reason: string
          recipient_type: string
          recorded_by?: string | null
          staff_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          point_type?: string
          points?: number
          reason?: string
          recipient_type?: string
          recorded_by?: string | null
          staff_id?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      student_discounts: {
        Row: {
          approved_by: string | null
          created_at: string
          discount_code: string | null
          discount_type: string
          end_date: string | null
          fee_type_id: string | null
          id: string
          is_active: boolean
          reason: string | null
          start_date: string
          student_id: string
          updated_at: string
          value: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          discount_code?: string | null
          discount_type?: string
          end_date?: string | null
          fee_type_id?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date?: string
          student_id: string
          updated_at?: string
          value?: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          discount_code?: string | null
          discount_type?: string
          end_date?: string | null
          fee_type_id?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          start_date?: string
          student_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      student_enrollments: {
        Row: {
          academic_year_id: string
          class_id: string
          created_at: string
          enrollment_date: string
          id: string
          status: string
          student_id: string
        }
        Insert: {
          academic_year_id: string
          class_id: string
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: string
          student_id: string
        }
        Update: {
          academic_year_id?: string
          class_id?: string
          created_at?: string
          enrollment_date?: string
          id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_transport: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          pickup_point: string | null
          route_id: string
          start_date: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point?: string | null
          route_id: string
          start_date?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          pickup_point?: string | null
          route_id?: string
          start_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_transport_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_transport_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_date: string | null
          blood_group: string | null
          created_at: string
          current_class_id: string | null
          date_of_birth: string | null
          district: string | null
          father_name: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          grandfather_name: string | null
          id: string
          is_active: boolean
          national_id: string | null
          notes: string | null
          phone: string | null
          photo_url: string | null
          province: string | null
          student_code: string
          tazkira_number: string | null
          updated_at: string
          user_id: string | null
          village: string | null
        }
        Insert: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          created_at?: string
          current_class_id?: string | null
          date_of_birth?: string | null
          district?: string | null
          father_name?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grandfather_name?: string | null
          id?: string
          is_active?: boolean
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          province?: string | null
          student_code: string
          tazkira_number?: string | null
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Update: {
          address?: string | null
          admission_date?: string | null
          blood_group?: string | null
          created_at?: string
          current_class_id?: string | null
          date_of_birth?: string | null
          district?: string | null
          father_name?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          grandfather_name?: string | null
          id?: string
          is_active?: boolean
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          province?: string | null
          student_code?: string
          tazkira_number?: string | null
          updated_at?: string
          user_id?: string | null
          village?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_current_class_id_fkey"
            columns: ["current_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          grade_id: string | null
          id: string
          name: string
          pass_marks: number | null
          total_marks: number | null
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          grade_id?: string | null
          id?: string
          name: string
          pass_marks?: number | null
          total_marks?: number | null
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          grade_id?: string | null
          id?: string
          name?: string
          pass_marks?: number | null
          total_marks?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          employee_code: string
          father_name: string | null
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          hire_date: string | null
          id: string
          national_id: string | null
          phone: string | null
          photo_url: string | null
          qualification: string | null
          salary: number | null
          specialization: string | null
          status: Database["public"]["Enums"]["employment_status"] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          employee_code: string
          father_name?: string | null
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          national_id?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          employee_code?: string
          father_name?: string | null
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          hire_date?: string | null
          id?: string
          national_id?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          salary?: number | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["employment_status"] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      teaching_assignments: {
        Row: {
          academic_year_id: string | null
          class_id: string
          created_at: string
          id: string
          subject_id: string
          teacher_id: string
        }
        Insert: {
          academic_year_id?: string | null
          class_id: string
          created_at?: string
          id?: string
          subject_id: string
          teacher_id: string
        }
        Update: {
          academic_year_id?: string | null
          class_id?: string
          created_at?: string
          id?: string
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_assignments_academic_year_id_fkey"
            columns: ["academic_year_id"]
            isOneToOne: false
            referencedRelation: "academic_years"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          capacity: number | null
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_active: boolean | null
          monthly_fee: number | null
          pickup_areas: string | null
          route_name: string
          updated_at: string
          vehicle_number: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          pickup_areas?: string | null
          route_name: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean | null
          monthly_fee?: number | null
          pickup_areas?: string | null
          route_name?: string
          updated_at?: string
          vehicle_number?: string | null
        }
        Relationships: []
      }
      uniforms: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          gender: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          size: string | null
          stock: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          name: string
          price?: number
          size?: string | null
          stock?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          gender?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          size?: string | null
          stock?: number
          updated_at?: string
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
      generate_next_id: { Args: { _entity: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "principal"
        | "teacher"
        | "accountant"
        | "librarian"
        | "parent"
        | "student"
      attendance_status: "present" | "absent" | "late" | "excused" | "sick"
      book_status: "available" | "borrowed" | "reserved" | "lost" | "damaged"
      discipline_severity: "low" | "medium" | "high" | "critical"
      employment_status: "active" | "inactive" | "on_leave" | "terminated"
      event_type:
        | "academic"
        | "cultural"
        | "sport"
        | "exam"
        | "holiday"
        | "meeting"
        | "other"
      exam_type: "monthly" | "midterm" | "final" | "quiz" | "annual"
      fee_frequency:
        | "one_time"
        | "monthly"
        | "quarterly"
        | "semester"
        | "yearly"
      gender_type: "male" | "female"
      payment_status: "pending" | "partial" | "paid" | "overdue" | "cancelled"
      term_type:
        | "first"
        | "second"
        | "final"
        | "quiz"
        | "midterm"
        | "assignment"
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
      app_role: [
        "admin",
        "principal",
        "teacher",
        "accountant",
        "librarian",
        "parent",
        "student",
      ],
      attendance_status: ["present", "absent", "late", "excused", "sick"],
      book_status: ["available", "borrowed", "reserved", "lost", "damaged"],
      discipline_severity: ["low", "medium", "high", "critical"],
      employment_status: ["active", "inactive", "on_leave", "terminated"],
      event_type: [
        "academic",
        "cultural",
        "sport",
        "exam",
        "holiday",
        "meeting",
        "other",
      ],
      exam_type: ["monthly", "midterm", "final", "quiz", "annual"],
      fee_frequency: ["one_time", "monthly", "quarterly", "semester", "yearly"],
      gender_type: ["male", "female"],
      payment_status: ["pending", "partial", "paid", "overdue", "cancelled"],
      term_type: ["first", "second", "final", "quiz", "midterm", "assignment"],
    },
  },
} as const
