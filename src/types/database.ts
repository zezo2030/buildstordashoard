// AUTO-GENERATED من سكيما Supabase — متعدّلش يدوي.
// التحديث: npm run db:types  (بيتحقق منه CI عشان الأنواع ما تبعدش عن الداتابيز)

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          apartment: string | null
          area: string
          block: string | null
          building: string | null
          company_id: string | null
          created_at: string
          extra_notes: string | null
          floor: string | null
          governorate: string
          id: string
          is_default: boolean
          label: string | null
          lat: number | null
          lng: number | null
          phone: string | null
          recipient: string | null
          street: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          apartment?: string | null
          area: string
          block?: string | null
          building?: string | null
          company_id?: string | null
          created_at?: string
          extra_notes?: string | null
          floor?: string | null
          governorate: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          recipient?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          apartment?: string | null
          area?: string
          block?: string | null
          building?: string | null
          company_id?: string | null
          created_at?: string
          extra_notes?: string | null
          floor?: string | null
          governorate?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          phone?: string | null
          recipient?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addresses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: number
          ip: unknown
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: number
          ip?: unknown
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: number
          ip?: unknown
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          bank_name: string
          company_id: string | null
          created_at: string
          holder_name: string
          iban: string
          id: string
          is_default: boolean
          user_id: string | null
        }
        Insert: {
          bank_name: string
          company_id?: string | null
          created_at?: string
          holder_name: string
          iban: string
          id?: string
          is_default?: boolean
          user_id?: string | null
        }
        Update: {
          bank_name?: string
          company_id?: string | null
          created_at?: string
          holder_name?: string
          iban?: string
          id?: string
          is_default?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          cart_id: string
          id: string
          is_selected: boolean
          qty: number
          seller_product_id: string
        }
        Insert: {
          added_at?: string
          cart_id: string
          id?: string
          is_selected?: boolean
          qty: number
          seller_product_id: string
        }
        Update: {
          added_at?: string
          cart_id?: string
          id?: string
          is_selected?: boolean
          qty?: number
          seller_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          site_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          site_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          site_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          code: string | null
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          parent_id: string | null
          sort_order: number
          specialty_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number
          specialty_id: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          parent_id?: string | null
          sort_order?: number
          specialty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          about_ar: string | null
          address_line: string | null
          area: string | null
          block: string | null
          commercial_register: string | null
          commission_rate: number
          cover_url: string | null
          created_at: string
          created_by: string | null
          credit_from: string | null
          credit_limit: number | null
          credit_to: string | null
          email: string | null
          governorate: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          lat: number | null
          lng: number | null
          logo_url: string | null
          name_ar: string
          name_en: string | null
          phones: string[]
          rating: number
          ratings_count: number
          slug: string | null
          street: string | null
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          tax_number: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at: string
        }
        Insert: {
          about_ar?: string | null
          address_line?: string | null
          area?: string | null
          block?: string | null
          commercial_register?: string | null
          commission_rate?: number
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          credit_from?: string | null
          credit_limit?: number | null
          credit_to?: string | null
          email?: string | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name_ar: string
          name_en?: string | null
          phones?: string[]
          rating?: number
          ratings_count?: number
          slug?: string | null
          street?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          tax_number?: string | null
          type: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Update: {
          about_ar?: string | null
          address_line?: string | null
          area?: string | null
          block?: string | null
          commercial_register?: string | null
          commission_rate?: number
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          credit_from?: string | null
          credit_limit?: number | null
          credit_to?: string | null
          email?: string | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          logo_url?: string | null
          name_ar?: string
          name_en?: string | null
          phones?: string[]
          rating?: number
          ratings_count?: number
          slug?: string | null
          street?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          tax_number?: string | null
          type?: Database["public"]["Enums"]["company_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          member_role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          comment: string | null
          company_id: string
          created_at: string
          id: string
          order_id: string | null
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          company_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          company_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_subusers: {
        Row: {
          account_code: string
          company_id: string | null
          created_at: string
          id: string
          member_number: number
          owner_id: string
          status: Database["public"]["Enums"]["account_status"]
          suspended_at: string | null
          updated_at: string
          user_id: string | null
          username: string
        }
        Insert: {
          account_code: string
          company_id?: string | null
          created_at?: string
          id?: string
          member_number: number
          owner_id: string
          status?: Database["public"]["Enums"]["account_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          username: string
        }
        Update: {
          account_code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          member_number?: number
          owner_id?: string
          status?: Database["public"]["Enums"]["account_status"]
          suspended_at?: string | null
          updated_at?: string
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_subusers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subusers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_subusers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_fee_rules: {
        Row: {
          area: string | null
          buyer_company_id: string | null
          created_at: string
          fee: number
          free_above: number | null
          governorate: string | null
          id: string
          is_active: boolean
          kind: string
          min_order_total: number
          priority: number
          seller_company_id: string | null
        }
        Insert: {
          area?: string | null
          buyer_company_id?: string | null
          created_at?: string
          fee: number
          free_above?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_order_total?: number
          priority?: number
          seller_company_id?: string | null
        }
        Update: {
          area?: string | null
          buyer_company_id?: string | null
          created_at?: string
          fee?: number
          free_above?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          min_order_total?: number
          priority?: number
          seller_company_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_fee_rules_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_fee_rules_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          app_version: string | null
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          discount_id: string
          id: string
          is_active: boolean
          per_user_limit: number
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_id: string
          id?: string
          is_active?: boolean
          per_user_limit?: number
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_id?: string
          id?: string
          is_active?: boolean
          per_user_limit?: number
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discounts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_redemptions: {
        Row: {
          amount: number
          created_at: string
          discount_code_id: string
          id: string
          order_group_id: string | null
          order_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount_code_id: string
          id?: string
          order_group_id?: string | null
          order_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount_code_id?: string
          id?: string
          order_group_id?: string | null
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_redemptions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_fk"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_order_group_id_fkey"
            columns: ["order_group_id"]
            isOneToOne: false
            referencedRelation: "order_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discounts: {
        Row: {
          banner_url: string | null
          category_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order_total: number
          name_ar: string
          product_id: string | null
          requires_code: boolean
          scope: Database["public"]["Enums"]["discount_scope"]
          seller_company_id: string | null
          specialty_id: string | null
          starts_at: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
        }
        Insert: {
          banner_url?: string | null
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_total?: number
          name_ar: string
          product_id?: string | null
          requires_code?: boolean
          scope?: Database["public"]["Enums"]["discount_scope"]
          seller_company_id?: string | null
          specialty_id?: string | null
          starts_at?: string
          type: Database["public"]["Enums"]["discount_type"]
          value: number
        }
        Update: {
          banner_url?: string | null
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order_total?: number
          name_ar?: string
          product_id?: string | null
          requires_code?: boolean
          scope?: Database["public"]["Enums"]["discount_scope"]
          seller_company_id?: string | null
          specialty_id?: string | null
          starts_at?: string
          type?: Database["public"]["Enums"]["discount_type"]
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      document_counters: {
        Row: {
          doc_type: string
          last_no: number
          year: number
        }
        Insert: {
          doc_type: string
          last_no?: number
          year: number
        }
        Update: {
          doc_type?: string
          last_no?: number
          year?: number
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer_ar: string
          answer_en: string | null
          category: string | null
          id: string
          is_active: boolean
          question_ar: string
          question_en: string | null
          sort_order: number
        }
        Insert: {
          answer_ar: string
          answer_en?: string | null
          category?: string | null
          id?: string
          is_active?: boolean
          question_ar: string
          question_en?: string | null
          sort_order?: number
        }
        Update: {
          answer_ar?: string
          answer_en?: string | null
          category?: string | null
          id?: string
          is_active?: boolean
          question_ar?: string
          question_en?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      favorite_companies: {
        Row: {
          company_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_products: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      home_banners: {
        Row: {
          body_ar: string | null
          brand_ar: string | null
          created_at: string
          cta_label_ar: string
          cta_route: string
          ends_at: string | null
          highlight_ar: string | null
          id: string
          image_url: string
          is_active: boolean
          sort_order: number
          starts_at: string | null
          title_ar: string | null
          updated_at: string
        }
        Insert: {
          body_ar?: string | null
          brand_ar?: string | null
          created_at?: string
          cta_label_ar?: string
          cta_route?: string
          ends_at?: string | null
          highlight_ar?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Update: {
          body_ar?: string | null
          brand_ar?: string | null
          created_at?: string
          cta_label_ar?: string
          cta_route?: string
          ends_at?: string | null
          highlight_ar?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title_ar?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          line_no: number
          line_total: number
          name_ar: string
          qty: number
          sku: string
          unit_ar: string
          unit_price: number
        }
        Insert: {
          id?: string
          invoice_id: string
          line_no: number
          line_total: number
          name_ar: string
          qty: number
          sku: string
          unit_ar: string
          unit_price: number
        }
        Update: {
          id?: string
          invoice_id?: string
          line_no?: number
          line_total?: number
          name_ar?: string
          qty?: number
          sku?: string
          unit_ar?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          buyer_snapshot: Json
          created_at: string
          currency: string
          delivery_fee: number
          discount_total: number
          id: string
          invoice_number: string
          is_locked: boolean
          issued_at: string
          order_id: string
          pdf_path: string | null
          seller_snapshot: Json
          subtotal: number
          total: number
          type: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          buyer_snapshot: Json
          created_at?: string
          currency?: string
          delivery_fee?: number
          discount_total?: number
          id?: string
          invoice_number: string
          is_locked?: boolean
          issued_at?: string
          order_id: string
          pdf_path?: string | null
          seller_snapshot: Json
          subtotal: number
          total: number
          type?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          buyer_snapshot?: Json
          created_at?: string
          currency?: string
          delivery_fee?: number
          discount_total?: number
          id?: string
          invoice_number?: string
          is_locked?: boolean
          issued_at?: string
          order_id?: string
          pdf_path?: string | null
          seller_snapshot?: Json
          subtotal?: number
          total?: number
          type?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          body: string
          id: string
          locale: string
          published_at: string
          slug: string
          version: number
        }
        Insert: {
          body: string
          id?: string
          locale: string
          published_at?: string
          slug: string
          version: number
        }
        Update: {
          body?: string
          id?: string
          locale?: string
          published_at?: string
          slug?: string
          version?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body_ar: string | null
          body_en: string | null
          created_at: string
          data: Json
          id: string
          image_url: string | null
          read_at: string | null
          title_ar: string
          title_en: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          read_at?: string | null
          title_ar: string
          title_en?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body_ar?: string | null
          body_en?: string | null
          created_at?: string
          data?: Json
          id?: string
          image_url?: string | null
          read_at?: string | null
          title_ar?: string
          title_en?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_groups: {
        Row: {
          address_id: string | null
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          grand_total: number
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          site_id: string | null
        }
        Insert: {
          address_id?: string | null
          buyer_company_id?: string | null
          buyer_id: string
          created_at?: string
          grand_total?: number
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          site_id?: string | null
        }
        Update: {
          address_id?: string | null
          buyer_company_id?: string | null
          buyer_id?: string
          created_at?: string
          grand_total?: number
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_groups_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_groups_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_groups_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_groups_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          buyer_approved: boolean | null
          created_at: string
          discount_amount: number
          id: string
          is_available: boolean
          line_total: number
          name_ar: string
          order_id: string
          origin_country: string | null
          original_unit_price: number | null
          product_id: string | null
          qty: number
          removed_by_buyer: boolean
          seller_product_id: string | null
          sku: string
          specialty_id: string | null
          unit_ar: string
          unit_price: number
        }
        Insert: {
          buyer_approved?: boolean | null
          created_at?: string
          discount_amount?: number
          id?: string
          is_available?: boolean
          line_total: number
          name_ar: string
          order_id: string
          origin_country?: string | null
          original_unit_price?: number | null
          product_id?: string | null
          qty: number
          removed_by_buyer?: boolean
          seller_product_id?: string | null
          sku: string
          specialty_id?: string | null
          unit_ar: string
          unit_price: number
        }
        Update: {
          buyer_approved?: boolean | null
          created_at?: string
          discount_amount?: number
          id?: string
          is_available?: boolean
          line_total?: number
          name_ar?: string
          order_id?: string
          origin_country?: string | null
          original_unit_price?: number | null
          product_id?: string | null
          qty?: number
          removed_by_buyer?: boolean
          seller_product_id?: string | null
          sku?: string
          specialty_id?: string | null
          unit_ar?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: number
          note?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: number
          note?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        Insert: {
          address_id?: string | null
          address_snapshot?: Json
          approved_at?: string | null
          buyer_company_id?: string | null
          buyer_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          quoted_at?: string | null
          review_due_at?: string | null
          seller_company_id: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          updated_at?: string
          wallet_applied?: number
        }
        Update: {
          address_id?: string | null
          address_snapshot?: Json
          approved_at?: string | null
          buyer_company_id?: string | null
          buyer_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          commission_amount?: number
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          discount_total?: number
          grand_total?: number
          id?: string
          notes?: string | null
          order_group_id?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          placed_at?: string
          quoted_at?: string | null
          review_due_at?: string | null
          seller_company_id?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          updated_at?: string
          wallet_applied?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_order_group_id_fkey"
            columns: ["order_group_id"]
            isOneToOne: false
            referencedRelation: "order_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway: string | null
          gateway_ref: string | null
          id: string
          idempotency_key: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_group_id: string | null
          paid_at: string | null
          raw_response: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          idempotency_key?: string | null
          method: Database["public"]["Enums"]["payment_method"]
          order_group_id?: string | null
          paid_at?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          idempotency_key?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          order_group_id?: string | null
          paid_at?: string | null
          raw_response?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_group_id_fkey"
            columns: ["order_group_id"]
            isOneToOne: false
            referencedRelation: "order_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_rules: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["discount_type"]
          adjustment_value: number
          category_id: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          product_id: string | null
          scope: Database["public"]["Enums"]["price_rule_scope"]
          seller_company_id: string
          specialty_id: string | null
          starts_at: string | null
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["discount_type"]
          adjustment_value: number
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          product_id?: string | null
          scope?: Database["public"]["Enums"]["price_rule_scope"]
          seller_company_id: string
          specialty_id?: string | null
          starts_at?: string | null
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["discount_type"]
          adjustment_value?: number
          category_id?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          product_id?: string | null
          scope?: Database["public"]["Enums"]["price_rule_scope"]
          seller_company_id?: string
          specialty_id?: string | null
          starts_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_rules_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
        ]
      }
      product_requests: {
        Row: {
          admin_note: string | null
          attachments: string[]
          company_id: string | null
          created_at: string
          id: string
          name_ar: string | null
          notes: string | null
          qty: number | null
          requester_id: string
          specialty_id: string | null
          status: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          attachments?: string[]
          company_id?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          notes?: string | null
          qty?: number | null
          requester_id: string
          specialty_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          attachments?: string[]
          company_id?: string | null
          created_at?: string
          id?: string
          name_ar?: string | null
          notes?: string | null
          qty?: number | null
          requester_id?: string
          specialty_id?: string | null
          status?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      product_submissions: {
        Row: {
          admin_note: string | null
          brand: string | null
          company_id: string | null
          created_at: string
          description_ar: string | null
          id: string
          images: string[]
          name_ar: string
          name_en: string | null
          origin_country: string | null
          seller_id: string
          specialty_id: string
          status: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          brand?: string | null
          company_id?: string | null
          created_at?: string
          description_ar?: string | null
          id?: string
          images: string[]
          name_ar: string
          name_en?: string | null
          origin_country?: string | null
          seller_id: string
          specialty_id: string
          status?: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          brand?: string | null
          company_id?: string | null
          created_at?: string
          description_ar?: string | null
          id?: string
          images?: string[]
          name_ar?: string
          name_en?: string | null
          origin_country?: string | null
          seller_id?: string
          specialty_id?: string
          status?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_submissions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json
          brand: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          description_ar: string | null
          description_en: string | null
          id: string
          images: string[]
          is_active: boolean
          name_ar: string
          name_en: string | null
          origin_country: string | null
          search_doc: unknown
          sku: string
          source_code: string | null
          specialty_id: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          attributes?: Json
          brand?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          origin_country?: string | null
          search_doc?: unknown
          sku: string
          source_code?: string | null
          specialty_id: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          attributes?: Json
          brand?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          description_en?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          origin_country?: string | null
          search_doc?: unknown
          sku?: string
          source_code?: string | null
          specialty_id?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms_at: string | null
          account_code: string | null
          account_seq: number
          avatar_url: string | null
          civil_id: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          last_seen_at: string | null
          locale: string
          nationality: string | null
          parent_account_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
          subuser_account_code: string | null
          suspend_reason: string | null
          suspended_at: string | null
          suspended_by: string | null
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          account_code?: string | null
          account_seq?: number
          avatar_url?: string | null
          civil_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id: string
          last_seen_at?: string | null
          locale?: string
          nationality?: string | null
          parent_account_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          subuser_account_code?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          account_code?: string | null
          account_seq?: number
          avatar_url?: string | null
          civil_id?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          last_seen_at?: string | null
          locale?: string
          nationality?: string | null
          parent_account_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          subuser_account_code?: string | null
          suspend_reason?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_invitations: {
        Row: {
          id: string
          invited_at: string
          quotation_id: string
          responded_at: string | null
          seller_company_id: string
          status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          id?: string
          invited_at?: string
          quotation_id: string
          responded_at?: string | null
          seller_company_id: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          id?: string
          invited_at?: string
          quotation_id?: string
          responded_at?: string | null
          seller_company_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quotation_invitations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_invitations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          id: string
          line_no: number
          notes: string | null
          preferred_origin: string | null
          product_id: string
          qty: number
          quotation_id: string
          selected_seller_company_id: string | null
          unit_id: string
        }
        Insert: {
          id?: string
          line_no: number
          notes?: string | null
          preferred_origin?: string | null
          product_id: string
          qty: number
          quotation_id: string
          selected_seller_company_id?: string | null
          unit_id: string
        }
        Update: {
          id?: string
          line_no?: number
          notes?: string | null
          preferred_origin?: string | null
          product_id?: string
          qty?: number
          quotation_id?: string
          selected_seller_company_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_selected_seller_company_id_fkey"
            columns: ["selected_seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          id: string
          issued_at: string | null
          notes: string | null
          quotation_number: string
          site_id: string | null
          status: Database["public"]["Enums"]["quotation_status"]
          title: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          buyer_company_id?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          quotation_number: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          title?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          buyer_company_id?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          quotation_number?: string
          site_id?: string | null
          status?: Database["public"]["Enums"]["quotation_status"]
          title?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string
          done_at: string | null
          error: string | null
          file_path: string | null
          id: string
          params: Json
          report_key: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          params?: Json
          report_key: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          error?: string | null
          file_path?: string | null
          id?: string
          params?: Json
          report_key?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      return_documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          pdf_path: string
          return_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          id?: string
          pdf_path: string
          return_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          pdf_path?: string
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_documents_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          accepted_total: number | null
          id: string
          order_item_id: string
          qty_accepted: number
          qty_rejected: number
          qty_requested: number
          rejection_reason: string | null
          return_id: string
          unit_price: number
        }
        Insert: {
          accepted_total?: number | null
          id?: string
          order_item_id: string
          qty_accepted?: number
          qty_rejected?: number
          qty_requested: number
          rejection_reason?: string | null
          return_id: string
          unit_price: number
        }
        Update: {
          accepted_total?: number | null
          id?: string
          order_item_id?: string
          qty_accepted?: number
          qty_rejected?: number
          qty_requested?: number
          rejection_reason?: string | null
          return_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "return_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      return_reasons: {
        Row: {
          code: string
          is_active: boolean
          label_ar: string
          label_en: string | null
          side: string
          sort_order: number
        }
        Insert: {
          code: string
          is_active?: boolean
          label_ar: string
          label_en?: string | null
          side?: string
          sort_order?: number
        }
        Update: {
          code?: string
          is_active?: boolean
          label_ar?: string
          label_en?: string | null
          side?: string
          sort_order?: number
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          attachments: string[]
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          picked_up_at: string | null
          reason_code: string | null
          reason_text: string | null
          received_at: string | null
          refund_amount: number
          refund_method: string | null
          refunded_at: string | null
          rejection_reason: string | null
          requested_at: string
          return_number: string
          seller_company_id: string
          seller_decided_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: number
          total_rejected: number
          updated_at: string
        }
        Insert: {
          attachments?: string[]
          buyer_company_id?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          order_id: string
          picked_up_at?: string | null
          reason_code?: string | null
          reason_text?: string | null
          received_at?: string | null
          refund_amount?: number
          refund_method?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          return_number: string
          seller_company_id: string
          seller_decided_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          total_accepted?: number
          total_rejected?: number
          updated_at?: string
        }
        Update: {
          attachments?: string[]
          buyer_company_id?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          order_id?: string
          picked_up_at?: string | null
          reason_code?: string | null
          reason_text?: string | null
          received_at?: string | null
          refund_amount?: number
          refund_method?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          requested_at?: string
          return_number?: string
          seller_company_id?: string
          seller_decided_at?: string | null
          status?: Database["public"]["Enums"]["return_status"]
          total_accepted?: number
          total_rejected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_reason_code_fkey"
            columns: ["reason_code"]
            isOneToOne: false
            referencedRelation: "return_reasons"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "return_requests_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_buyer_credit: {
        Row: {
          buyer_company_id: string
          created_at: string
          credit_limit: number
          ends_on: string | null
          id: string
          is_active: boolean
          seller_company_id: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          created_at?: string
          credit_limit: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          seller_company_id: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          created_at?: string
          credit_limit?: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          seller_company_id?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_buyer_credit_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_buyer_credit_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_discount_rules: {
        Row: {
          buyer_company_id: string | null
          buyer_type: string | null
          buyer_user_id: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: string
          max_total: number | null
          min_total: number | null
          percent: number
          seller_company_id: string
          updated_at: string
        }
        Insert: {
          buyer_company_id?: string | null
          buyer_type?: string | null
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind: string
          max_total?: number | null
          min_total?: number | null
          percent: number
          seller_company_id: string
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string | null
          buyer_type?: string | null
          buyer_user_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: string
          max_total?: number | null
          min_total?: number | null
          percent?: number
          seller_company_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_discount_rules_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_discount_rules_buyer_user_id_fkey"
            columns: ["buyer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_discount_rules_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_product_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_price: number
          old_price: number | null
          seller_product_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price: number
          old_price?: number | null
          seller_product_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_price?: number
          old_price?: number | null
          seller_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_product_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_product_price_history_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_products: {
        Row: {
          compare_at_price: number | null
          created_at: string
          id: string
          is_active: boolean
          lead_time_days: number | null
          min_order_qty: number
          origin_country: string | null
          price: number
          product_id: string
          seller_company_id: string
          stock_qty: number | null
          track_stock: boolean
          unit_id: string
          updated_at: string
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          origin_country?: string | null
          price: number
          product_id: string
          seller_company_id: string
          stock_qty?: number | null
          track_stock?: boolean
          unit_id: string
          updated_at?: string
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          lead_time_days?: number | null
          min_order_qty?: number
          origin_country?: string | null
          price?: number
          product_id?: string
          seller_company_id?: string
          stock_qty?: number | null
          track_stock?: boolean
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_products_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_products_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address_line: string | null
          area: string | null
          block: string | null
          code: string | null
          company_id: string
          created_at: string
          governorate: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          manager_name: string | null
          manager_phone: string | null
          name: string
          street: string | null
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          area?: string | null
          block?: string | null
          code?: string | null
          company_id: string
          created_at?: string
          governorate?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          name: string
          street?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          area?: string | null
          block?: string | null
          code?: string | null
          company_id?: string
          created_at?: string
          governorate?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          manager_name?: string | null
          manager_phone?: string | null
          name?: string
          street?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      specialties: {
        Row: {
          code: string
          color: string | null
          created_at: string
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name_ar: string
          name_en: string | null
          sort_order: number
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar: string
          name_en?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name_ar?: string
          name_en?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string | null
          company_id: string | null
          created_at: string
          id: string
          priority: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          ticket_number: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          priority?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          ticket_number?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: string[]
          body: string
          created_at: string
          id: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          attachments?: string[]
          body: string
          created_at?: string
          id?: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          attachments?: string[]
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          code: string
          decimals: number
          id: string
          name_ar: string
          name_en: string | null
        }
        Insert: {
          code: string
          decimals?: number
          id?: string
          name_ar: string
          name_en?: string | null
        }
        Update: {
          code?: string
          decimals?: number
          id?: string
          name_ar?: string
          name_en?: string | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description_ar: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description_ar?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          status?: Database["public"]["Enums"]["wallet_txn_status"]
          type?: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          is_frozen: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_frozen?: boolean
          owner_id: string
          owner_type: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          is_frozen?: boolean
          owner_id?: string
          owner_type?: Database["public"]["Enums"]["wallet_owner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_note: string | null
          amount: number
          bank_account_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_by: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          transfer_ref: string | null
          updated_at: string
          wallet_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          bank_account_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_by: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transfer_ref?: string | null
          updated_at?: string
          wallet_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          bank_account_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          requested_by?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          transfer_ref?: string | null
          updated_at?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_customer_top_products: {
        Row: {
          customer_key: string | null
          name_ar: string | null
          product_id: string | null
          qty_sold: number | null
          seller_company_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_seller_customers: {
        Row: {
          buyer_company_id: string | null
          buyer_id: string | null
          customer_key: string | null
          orders_count: number | null
          period_month: string | null
          seller_company_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_seller_sales_by_specialty: {
        Row: {
          period_month: string | null
          qty_sold: number | null
          seller_company_id: string | null
          specialty_ar: string | null
          specialty_id: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_specialty_id_fkey"
            columns: ["specialty_id"]
            isOneToOne: false
            referencedRelation: "specialties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_seller_top_products: {
        Row: {
          name_ar: string | null
          orders_count: number | null
          period_month: string | null
          product_id: string | null
          qty_sold: number | null
          seller_company_id: string | null
          sku: string | null
          total_amount: number | null
          unit_ar: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_site_purchases: {
        Row: {
          company_id: string | null
          items_qty: number | null
          orders_count: number | null
          period_month: string | null
          site_code: string | null
          site_id: string | null
          site_name: string | null
          total_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pending_return_credit: {
        Row: {
          buyer_company_id: string | null
          buyer_id: string | null
          pending_amount: number | null
          pending_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_cheapest_offer_to_cart: {
        Args: { p_product_id: string; p_qty?: unknown }
        Returns: Json
      }
      add_draft_quotation_estimate_to_cart: {
        Args: { p_mode: string; p_seller_company_id?: string }
        Returns: Json
      }
      add_to_cart: {
        Args: {
          p_company_id?: string
          p_qty: unknown
          p_seller_product_id: string
          p_site_id?: string
        }
        Returns: {
          added_at: string
          cart_id: string
          id: string
          is_selected: boolean
          qty: number
          seller_product_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      add_to_draft_quotation: {
        Args: {
          p_preferred_origin?: string
          p_product_id: string
          p_qty?: unknown
        }
        Returns: Json
      }
      admin_accounts_list: {
        Args: {
          p_dir?: string
          p_from?: string
          p_kind: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      admin_accounts_stats: {
        Args: { p_from?: string; p_kind: string; p_to?: string }
        Returns: Json
      }
      admin_activate_seller: {
        Args: {
          p_commercial_register?: string
          p_governorate?: string
          p_name_ar: string
          p_phone?: string
          p_profile_id: string
        }
        Returns: string
      }
      admin_broadcast: {
        Args: {
          p_body_ar?: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_title_ar: string
        }
        Returns: number
      }
      admin_complete_individual_buyer: {
        Args: {
          p_civil_id: string
          p_full_name: string
          p_nationality: string
          p_owner_id: string
          p_phone: string
        }
        Returns: string
      }
      admin_create_buyer_company: {
        Args: {
          p_address?: string
          p_civil_id: string
          p_commercial_register?: string
          p_company_code?: string
          p_name_ar: string
          p_owner_id: string
          p_phone: string
        }
        Returns: string
      }
      admin_create_seller_company: {
        Args: {
          p_commercial_register?: string
          p_commission_rate?: number
          p_governorate?: string
          p_name_ar: string
          p_owner_id: string
          p_phone?: string
        }
        Returns: string
      }
      admin_dashboard_stats: { Args: never; Returns: Json }
      admin_decide_product_request: {
        Args: { p_note?: string; p_request_id: string; p_status: string }
        Returns: undefined
      }
      admin_decide_product_submission: {
        Args: { p_id: string; p_note?: string; p_status: string }
        Returns: undefined
      }
      admin_decide_withdrawal: {
        Args: {
          p_approve: boolean
          p_id: string
          p_note?: string
          p_transfer_ref?: string
        }
        Returns: {
          admin_note: string | null
          amount: number
          bank_account_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_by: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          transfer_ref: string | null
          updated_at: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_invoices_list: {
        Args: {
          p_buyer?: string
          p_dir?: string
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_seller?: string
          p_sort?: string
          p_to?: string
        }
        Returns: Json
      }
      admin_invoices_stats: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_orders_list: {
        Args: {
          p_dir?: string
          p_from?: string
          p_limit?: number
          p_method?: string
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      admin_overview_counts: { Args: never; Returns: Json }
      admin_reactivate_account: {
        Args: { p_profile_id: string }
        Returns: undefined
      }
      admin_reactivate_company: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      admin_reject_seller: {
        Args: { p_note?: string; p_profile_id: string }
        Returns: undefined
      }
      admin_returns_list: {
        Args: {
          p_dir?: string
          p_from?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
        }
        Returns: Json
      }
      admin_returns_stats: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_sales_by_specialty: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_sales_range: {
        Args: { p_from?: string; p_to?: string }
        Returns: Json
      }
      admin_sales_series: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      admin_set_account_status: {
        Args: {
          p_profile_id: string
          p_status: Database["public"]["Enums"]["account_status"]
        }
        Returns: undefined
      }
      admin_set_company_commission: {
        Args: { p_company_id: string; p_rate: number }
        Returns: undefined
      }
      admin_suspend_account: {
        Args: { p_profile_id: string; p_reason: string }
        Returns: undefined
      }
      admin_suspend_company: {
        Args: { p_company_id: string; p_reason: string }
        Returns: undefined
      }
      admin_wallet_adjust: {
        Args: { p_amount: unknown; p_description: string; p_wallet_id: string }
        Returns: {
          amount: number
          balance_after: number
          created_at: string
          created_by: string | null
          description_ar: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          status: Database["public"]["Enums"]["wallet_txn_status"]
          type: Database["public"]["Enums"]["wallet_txn_type"]
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      buyer_billing_structure: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          item_id: string
          line_total: unknown
          name_ar: string
          qty: number
          seller_id: string
          seller_name: string
          site_code: string
          site_id: string
          site_name: string
          sku: string
          unit_ar: string
        }[]
      }
      buyer_invoice_files: {
        Args: {
          p_from?: string
          p_item?: string
          p_search?: string
          p_site?: string
          p_to?: string
        }
        Returns: {
          invoice_id: string
          invoice_number: string
          issued_at: string
          order_id: string
          pdf_path: string
          seller_name: string
          site_code: string
          site_name: string
          total: unknown
        }[]
      }
      buyer_invoice_items: {
        Args: {
          p_from?: string
          p_item?: string
          p_search?: string
          p_site?: string
          p_to?: string
        }
        Returns: {
          invoice_number: string
          issued_at: string
          item_id: string
          line_total: unknown
          name_ar: string
          qty: number
          seller_name: string
          site_name: string
          sku: string
          unit_ar: string
          unit_price: unknown
        }[]
      }
      buyer_report_past_orders: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          delivered_at: string
          grand_total: unknown
          items_count: number
          order_id: string
          order_number: string
          placed_at: string
          seller_label: string
        }[]
      }
      buyer_report_products_by_site: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          company_name: string
          image_url: string
          name_ar: string
          product_id: string
          qty_sold: number
          site_code: string
          site_id: string
          site_name: string
          sku: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      buyer_report_products_by_supplier: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          image_url: string
          name_ar: string
          product_id: string
          qty_sold: number
          sku: string
          supplier_id: string
          supplier_logo: string
          supplier_name: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      buyer_report_top_products: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          image_url: string
          name_ar: string
          orders_count: number
          product_id: string
          qty_sold: number
          sku: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      buyer_report_top_sites: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          company_name: string
          items_count: number
          orders_count: number
          site_code: string
          site_id: string
          site_name: string
          total_amount: unknown
          units_qty: number
        }[]
      }
      buyer_report_top_specialties: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          image_url: string
          items_count: number
          name_ar: string
          specialty_id: string
          total_amount: unknown
          units_qty: number
        }[]
      }
      buyer_report_top_suppliers: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          logo_url: string
          name_ar: string
          orders_count: number
          seller_company_id: string
          total_amount: unknown
          units_qty: number
        }[]
      }
      buyer_respond_quote: {
        Args: { p_order_id: string; p_removed_item_ids?: string[] }
        Returns: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clear_draft_quotation: { Args: never; Returns: Json }
      confirm_payment: { Args: { p_payment_id: string }; Returns: undefined }
      convert_level_for_branches: {
        Args: {
          p_level_category_id: string
          p_mode: string
          p_new_branch_code?: string
          p_new_branch_name_ar?: string
          p_specialty_id: string
        }
        Returns: string
      }
      create_return_request: {
        Args: {
          p_items: Json
          p_order_id: string
          p_reason_code: string
          p_reason_text: string
        }
        Returns: {
          attachments: string[]
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          picked_up_at: string | null
          reason_code: string | null
          reason_text: string | null
          received_at: string | null
          refund_amount: number
          refund_method: string | null
          refunded_at: string | null
          rejection_reason: string | null
          requested_at: string
          return_number: string
          seller_company_id: string
          seller_decided_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: number
          total_rejected: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_return: {
        Args: {
          p_decisions: Json
          p_rejection_reason?: string
          p_return_id: string
        }
        Returns: {
          attachments: string[]
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          picked_up_at: string | null
          reason_code: string | null
          reason_text: string | null
          received_at: string | null
          refund_amount: number
          refund_method: string | null
          refunded_at: string | null
          rejection_reason: string | null
          requested_at: string
          return_number: string
          seller_company_id: string
          seller_decided_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: number
          total_rejected: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_account: { Args: never; Returns: undefined }
      issue_draft_quotation: { Args: { p_valid_until?: string }; Returns: Json }
      list_favorite_products: { Args: never; Returns: Json }
      pay_order: {
        Args: {
          p_expected_total: unknown
          p_order_group_id: string
          p_use_wallet?: boolean
        }
        Returns: string
      }
      place_order: {
        Args: {
          p_address_id: string
          p_company_id?: string
          p_discount_code?: string
          p_notes?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_site_id?: string
        }
        Returns: string
      }
      preview_checkout: {
        Args: {
          p_address_id?: string
          p_company_id?: string
          p_discount_code?: string
          p_use_wallet?: boolean
        }
        Returns: Json
      }
      preview_draft_quotation: { Args: never; Returns: Json }
      receive_return: {
        Args: { p_return_id: string }
        Returns: {
          attachments: string[]
          buyer_company_id: string | null
          buyer_id: string
          created_at: string
          id: string
          order_id: string
          picked_up_at: string | null
          reason_code: string | null
          reason_text: string | null
          received_at: string | null
          refund_amount: number
          refund_method: string | null
          refunded_at: string | null
          rejection_reason: string | null
          requested_at: string
          return_number: string
          seller_company_id: string
          seller_decided_at: string | null
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: number
          total_rejected: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "return_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_device_token: {
        Args: { p_app_version?: string; p_platform: string; p_token: string }
        Returns: undefined
      }
      remove_draft_quotation_item: {
        Args: { p_item_id: string }
        Returns: Json
      }
      report_sales_by_specialty: {
        Args: { p_from: string; p_seller_company_id: string; p_to: string }
        Returns: {
          share_pct: number
          specialty_ar: string
          specialty_id: string
          total_amount: number
        }[]
      }
      report_seller_top_products: {
        Args: {
          p_from: string
          p_limit?: number
          p_seller_company_id: string
          p_to: string
        }
        Returns: {
          name_ar: string
          product_id: string
          qty_sold: number
          sku: string
          total_amount: number
          unit_ar: string
        }[]
      }
      report_top_sites: {
        Args: {
          p_company_id: string
          p_from: string
          p_limit?: number
          p_to: string
        }
        Returns: {
          items_qty: number
          orders_count: number
          site_code: string
          site_id: string
          site_name: string
          total_amount: number
        }[]
      }
      request_withdrawal: {
        Args: {
          p_amount: unknown
          p_bank_account_id: string
          p_wallet_id: string
        }
        Returns: {
          admin_note: string | null
          amount: number
          bank_account_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          requested_by: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          transfer_ref: string | null
          updated_at: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawal_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_account_subuser: {
        Args: { p_company_id: string; p_owner_id: string; p_username: string }
        Returns: {
          account_code: string
          member_number: number
          reservation_id: string
        }[]
      }
      reserve_company_subuser: {
        Args: { p_company_id: string; p_owner_id: string; p_username: string }
        Returns: {
          account_code: string
          member_number: number
          reservation_id: string
        }[]
      }
      seller_add_products: {
        Args: { p_product_ids: string[] }
        Returns: {
          product_id: string
          seller_product_id: string
        }[]
      }
      seller_advance_order: {
        Args: {
          p_order_id: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_balance_summary: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          bank_holder: string
          bank_iban: string
          bank_name: string
          credit_balance: unknown
          period_sales: unknown
          returns_credit: unknown
          total_sales: unknown
          wallet_balance: unknown
        }[]
      }
      seller_buyer_companies: {
        Args: {
          p_exclude?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
        }
        Returns: {
          buyer_kind: string
          company_code: string
          id: string
          name_ar: string
          total_count: number
        }[]
      }
      seller_catalog_list: {
        Args: { p_search?: string; p_specialty_id?: string }
        Returns: {
          category_id: string
          image_url: string
          is_active: boolean
          name_ar: string
          price: unknown
          product_id: string
          seller_product_id: string
          sku: string
          specialty_id: string
          specialty_name: string
          unit_ar: string
        }[]
      }
      seller_credit_list: {
        Args: { p_search?: string; p_sort?: string }
        Returns: {
          buyer_company_id: string
          company_code: string
          company_label: string
          credit_limit: unknown
          ends_on: string
          id: string
          is_active: boolean
          outstanding: unknown
          remaining: unknown
          starts_on: string
          total_count: number
        }[]
      }
      seller_dashboard_summary: {
        Args: never
        Returns: {
          customers_count: number
          listed_items: number
          orders_count: number
          products_sold: number
          total_sales: unknown
        }[]
      }
      seller_delete_credit: { Args: { p_id: string }; Returns: undefined }
      seller_delete_delivery_rule: {
        Args: { p_id: string }
        Returns: undefined
      }
      seller_delete_discount_rule: {
        Args: { p_id: string }
        Returns: undefined
      }
      seller_delivery_rules_list: {
        Args: never
        Returns: {
          buyer_company_id: string
          company_code: string
          company_label: string
          fee: unknown
          free_above: unknown
          governorate: string
          id: string
          is_active: boolean
          kind: string
          min_order_total: unknown
        }[]
      }
      seller_discount_rules_list: {
        Args: never
        Returns: {
          buyer_company_id: string
          buyer_type: string
          buyer_user_id: string
          company_code: string
          company_label: string
          id: string
          is_active: boolean
          kind: string
          max_total: unknown
          min_total: unknown
          percent: number
        }[]
      }
      seller_order_detail: {
        Args: { p_order_id: string }
        Returns: {
          address_snapshot: Json
          buyer_code: string
          buyer_is_company: boolean
          buyer_label: string
          cancel_reason: string
          created_at: string
          delivery_fee: unknown
          discount_total: unknown
          grand_total: unknown
          id: string
          invoice_id: string
          is_returning: boolean
          notes: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          prior_amount: unknown
          prior_orders: number
          prior_qty: number
          quoted_at: string
          review_due_at: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: unknown
        }[]
      }
      seller_orders_list: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: {
          buyer_code: string
          buyer_label: string
          created_at: string
          grand_total: unknown
          id: string
          invoice_id: string
          items_count: number
          order_number: string
          review_due_at: string
          status: Database["public"]["Enums"]["order_status"]
          total_count: number
        }[]
      }
      seller_pickable_products: {
        Args: { p_search?: string; p_specialty_id?: string }
        Returns: {
          image_url: string
          in_catalog: boolean
          is_active: boolean
          name_ar: string
          price: unknown
          product_id: string
          seller_product_id: string
          sku: string
          specialty_id: string
          specialty_name: string
          unit_ar: string
        }[]
      }
      seller_quote_order: {
        Args: { p_delivery_fee?: unknown; p_items: Json; p_order_id: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_reject_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json
          approved_at: string | null
          buyer_company_id: string | null
          buyer_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          commission_amount: number
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          discount_total: number
          grand_total: number
          id: string
          notes: string | null
          order_group_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          placed_at: string
          quoted_at: string | null
          review_due_at: string | null
          seller_company_id: string
          site_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          updated_at: string
          wallet_applied: number
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_report_past_orders: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          buyer_code: string
          buyer_label: string
          delivered_at: string
          grand_total: unknown
          items_count: number
          order_id: string
          order_number: string
          placed_at: string
        }[]
      }
      seller_report_products_by_customer: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          buyer_code: string
          buyer_key: string
          buyer_label: string
          image_url: string
          name_ar: string
          product_id: string
          qty_sold: number
          sku: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      seller_report_products_by_site: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          company_name: string
          image_url: string
          name_ar: string
          product_id: string
          qty_sold: number
          site_code: string
          site_id: string
          site_name: string
          sku: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      seller_report_purchase_distribution: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          buyer_code: string
          buyer_key: string
          buyer_label: string
          items_count: number
          orders_count: number
          sites_count: number
          total_amount: unknown
        }[]
      }
      seller_report_top_customers: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          buyer_code: string
          buyer_key: string
          buyer_label: string
          items_count: number
          orders_count: number
          total_amount: unknown
          units_qty: number
        }[]
      }
      seller_report_top_products: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          image_url: string
          name_ar: string
          orders_count: number
          product_id: string
          qty_sold: number
          sku: string
          total_amount: unknown
          unit_ar: string
        }[]
      }
      seller_report_top_sites: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          company_name: string
          items_count: number
          orders_count: number
          site_code: string
          site_id: string
          site_name: string
          total_amount: unknown
          units_qty: number
        }[]
      }
      seller_report_top_specialties: {
        Args: { p_from?: string; p_search?: string; p_to?: string }
        Returns: {
          image_url: string
          items_count: number
          name_ar: string
          specialty_id: string
          total_amount: unknown
          units_qty: number
        }[]
      }
      seller_return_detail: {
        Args: { p_return_id: string }
        Returns: {
          buyer_address: string
          buyer_code: string
          buyer_email: string
          buyer_is_company: boolean
          buyer_label: string
          buyer_logo_url: string
          buyer_phone: string
          buyer_register: string
          buyer_tax_number: string
          decided_at: string
          id: string
          invoice_issued_at: string
          invoice_number: string
          order_id: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          placed_at: string
          reason_code: string
          reason_label: string
          reason_text: string
          refund_amount: unknown
          refunded_at: string
          rejection_reason: string
          requested_at: string
          return_number: string
          seller_logo_url: string
          seller_name: string
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: unknown
          total_rejected: unknown
        }[]
      }
      seller_return_items: {
        Args: { p_return_id: string }
        Returns: {
          discount_share: unknown
          id: string
          image_url: string
          line_value: unknown
          name_ar: string
          order_item_id: string
          qty_accepted: unknown
          qty_rejected: unknown
          qty_requested: unknown
          sku: string
          unit_ar: string
          unit_price: unknown
        }[]
      }
      seller_returns_list: {
        Args: {
          p_company?: string
          p_from?: string
          p_limit?: number
          p_number?: string
          p_offset?: number
          p_scope?: string
          p_search?: string
          p_sort?: string
          p_status?: string
          p_to?: string
        }
        Returns: {
          buyer_code: string
          buyer_label: string
          decided_at: string
          id: string
          items_count: number
          refunded_at: string
          requested_at: string
          requested_value: unknown
          return_number: string
          status: Database["public"]["Enums"]["return_status"]
          total_accepted: unknown
          total_count: number
        }[]
      }
      seller_set_credit: {
        Args: {
          p_buyer_company_id: string
          p_credit_limit: unknown
          p_ends_on?: string
          p_id?: string
          p_starts_on: string
        }
        Returns: {
          buyer_company_id: string
          created_at: string
          credit_limit: number
          ends_on: string | null
          id: string
          is_active: boolean
          seller_company_id: string
          starts_on: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seller_buyer_credit"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_set_delivery_rule: {
        Args: {
          p_buyer_company_id?: string
          p_fee: unknown
          p_free_above?: unknown
          p_governorate?: string
          p_id?: string
          p_is_active?: boolean
          p_kind: string
          p_min_order_total?: unknown
        }
        Returns: {
          area: string | null
          buyer_company_id: string | null
          created_at: string
          fee: number
          free_above: number | null
          governorate: string | null
          id: string
          is_active: boolean
          kind: string
          min_order_total: number
          priority: number
          seller_company_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "delivery_fee_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_set_discount_rule: {
        Args: {
          p_buyer_company_id?: string
          p_buyer_type?: string
          p_buyer_user_id?: string
          p_id?: string
          p_is_active?: boolean
          p_kind: string
          p_max_total?: unknown
          p_min_total?: unknown
          p_percent: number
        }
        Returns: {
          buyer_company_id: string | null
          buyer_type: string | null
          buyer_user_id: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: string
          max_total: number | null
          min_total: number | null
          percent: number
          seller_company_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seller_discount_rules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seller_set_prices: { Args: { p_items: Json }; Returns: number }
      seller_set_product_active: {
        Args: { p_is_active: boolean; p_seller_product_id: string }
        Returns: boolean
      }
      seller_specialty_summary: {
        Args: never
        Returns: {
          image_url: string
          name_ar: string
          product_count: number
          specialty_id: string
          total_before: unknown
        }[]
      }
      set_draft_quotation_item_supplier: {
        Args: { p_item_id: string; p_seller_company_id?: string }
        Returns: Json
      }
      set_invoice_pdf_path: {
        Args: { p_invoice_id: string; p_path: string }
        Returns: string
      }
      update_draft_quotation_item: {
        Args: { p_item_id: string; p_preferred_origin?: string; p_qty: unknown }
        Returns: Json
      }
    }
    Enums: {
      account_status: "pending" | "active" | "suspended" | "rejected"
      company_type: "buyer" | "seller"
      discount_scope: "all" | "specialty" | "category" | "product"
      discount_type: "percentage" | "fixed"
      member_role: "owner" | "manager" | "purchaser" | "viewer"
      notification_type:
        | "order"
        | "return"
        | "quotation"
        | "wallet"
        | "promo"
        | "system"
      offer_status:
        | "invited"
        | "submitted"
        | "declined"
        | "awarded"
        | "not_awarded"
        | "expired"
      order_status:
        | "awaiting_seller_review"
        | "quoted"
        | "awaiting_payment"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_method:
        | "knet"
        | "apple_pay"
        | "credit_card"
        | "wallet"
        | "credit_terms"
        | "cash_on_delivery"
      payment_status:
        | "pending"
        | "authorized"
        | "paid"
        | "failed"
        | "refunded"
        | "partially_refunded"
      price_rule_scope: "all" | "specialty" | "category" | "product"
      quotation_status:
        | "draft"
        | "issued"
        | "offers_received"
        | "awarded"
        | "expired"
        | "cancelled"
      return_status:
        | "draft"
        | "submitted"
        | "seller_review"
        | "approved"
        | "partially_approved"
        | "rejected"
        | "picked_up"
        | "received"
        | "refunded"
        | "cancelled"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "individual_buyer" | "company_buyer" | "seller" | "admin"
      wallet_owner_type: "user" | "company"
      wallet_txn_status: "pending" | "completed" | "failed" | "reversed"
      wallet_txn_type:
        | "topup"
        | "withdrawal"
        | "order_payment"
        | "order_refund"
        | "return_credit"
        | "commission"
        | "adjustment"
      withdrawal_status: "pending" | "approved" | "rejected" | "paid"
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
      account_status: ["pending", "active", "suspended", "rejected"],
      company_type: ["buyer", "seller"],
      discount_scope: ["all", "specialty", "category", "product"],
      discount_type: ["percentage", "fixed"],
      member_role: ["owner", "manager", "purchaser", "viewer"],
      notification_type: [
        "order",
        "return",
        "quotation",
        "wallet",
        "promo",
        "system",
      ],
      offer_status: [
        "invited",
        "submitted",
        "declined",
        "awarded",
        "not_awarded",
        "expired",
      ],
      order_status: [
        "awaiting_seller_review",
        "quoted",
        "awaiting_payment",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_method: [
        "knet",
        "apple_pay",
        "credit_card",
        "wallet",
        "credit_terms",
        "cash_on_delivery",
      ],
      payment_status: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      price_rule_scope: ["all", "specialty", "category", "product"],
      quotation_status: [
        "draft",
        "issued",
        "offers_received",
        "awarded",
        "expired",
        "cancelled",
      ],
      return_status: [
        "draft",
        "submitted",
        "seller_review",
        "approved",
        "partially_approved",
        "rejected",
        "picked_up",
        "received",
        "refunded",
        "cancelled",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["individual_buyer", "company_buyer", "seller", "admin"],
      wallet_owner_type: ["user", "company"],
      wallet_txn_status: ["pending", "completed", "failed", "reversed"],
      wallet_txn_type: [
        "topup",
        "withdrawal",
        "order_payment",
        "order_refund",
        "return_credit",
        "commission",
        "adjustment",
      ],
      withdrawal_status: ["pending", "approved", "rejected", "paid"],
    },
  },
} as const
