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
    PostgrestVersion: "14.15"
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
          qty: number
          seller_product_id: string
        }
        Insert: {
          added_at?: string
          cart_id: string
          id?: string
          qty: number
          seller_product_id: string
        }
        Update: {
          added_at?: string
          cart_id?: string
          id?: string
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
          created_at: string
          fee: number
          free_above: number | null
          governorate: string | null
          id: string
          is_active: boolean
          min_order_total: number
          priority: number
          seller_company_id: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          fee: number
          free_above?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number
          priority?: number
          seller_company_id?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          fee?: number
          free_above?: number | null
          governorate?: string | null
          id?: string
          is_active?: boolean
          min_order_total?: number
          priority?: number
          seller_company_id?: string | null
        }
        Relationships: [
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
          order_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          discount_code_id: string
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          discount_code_id?: string
          id?: string
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
      favorites: {
        Row: {
          created_at: string
          seller_product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          seller_product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          seller_product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_seller_product_id_fkey"
            columns: ["seller_product_id"]
            isOneToOne: false
            referencedRelation: "seller_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
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
          created_at: string
          discount_amount: number
          id: string
          line_total: number
          name_ar: string
          order_id: string
          origin_country: string | null
          product_id: string | null
          qty: number
          seller_product_id: string | null
          sku: string
          specialty_id: string | null
          unit_ar: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total: number
          name_ar: string
          order_id: string
          origin_country?: string | null
          product_id?: string | null
          qty: number
          seller_product_id?: string | null
          sku: string
          specialty_id?: string | null
          unit_ar: string
          unit_price: number
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          name_ar?: string
          order_id?: string
          origin_country?: string | null
          product_id?: string | null
          qty?: number
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
          name_ar: string
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
          name_ar: string
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
          name_ar?: string
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
          updated_at: string
        }
        Insert: {
          accepted_terms_at?: string | null
          account_code?: string | null
          account_seq?: number
          avatar_url?: string | null
          civil_id?: string | null
          created_at?: string
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
          updated_at?: string
        }
        Update: {
          accepted_terms_at?: string | null
          account_code?: string | null
          account_seq?: number
          avatar_url?: string | null
          civil_id?: string | null
          created_at?: string
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
            foreignKeyName: "quotation_invitations_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_comparison"
            referencedColumns: ["quotation_id"]
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
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_comparison"
            referencedColumns: ["quotation_id"]
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
      quotation_offer_lines: {
        Row: {
          available_qty: number | null
          id: string
          is_available: boolean
          lead_time_days: number | null
          line_total: number | null
          notes: string | null
          offer_id: string
          origin_country: string | null
          quotation_item_id: string
          unit_price: number | null
        }
        Insert: {
          available_qty?: number | null
          id?: string
          is_available?: boolean
          lead_time_days?: number | null
          line_total?: number | null
          notes?: string | null
          offer_id: string
          origin_country?: string | null
          quotation_item_id: string
          unit_price?: number | null
        }
        Update: {
          available_qty?: number | null
          id?: string
          is_available?: boolean
          lead_time_days?: number | null
          line_total?: number | null
          notes?: string | null
          offer_id?: string
          origin_country?: string | null
          quotation_item_id?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_offer_lines_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "quotation_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_offer_lines_quotation_item_id_fkey"
            columns: ["quotation_item_id"]
            isOneToOne: false
            referencedRelation: "quotation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_offer_lines_quotation_item_id_fkey"
            columns: ["quotation_item_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_best_lines"
            referencedColumns: ["quotation_item_id"]
          },
        ]
      }
      quotation_offers: {
        Row: {
          created_at: string
          delivery_fee: number
          id: string
          lead_time_days: number | null
          notes: string | null
          pdf_path: string | null
          quotation_id: string
          seller_company_id: string
          status: Database["public"]["Enums"]["offer_status"]
          submitted_at: string
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          delivery_fee?: number
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          pdf_path?: string | null
          quotation_id: string
          seller_company_id: string
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          delivery_fee?: number
          id?: string
          lead_time_days?: number | null
          notes?: string | null
          pdf_path?: string | null
          quotation_id?: string
          seller_company_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
          submitted_at?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_offers_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_offers_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_comparison"
            referencedColumns: ["quotation_id"]
          },
          {
            foreignKeyName: "quotation_offers_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          awarded_offer_id: string | null
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
          awarded_offer_id?: string | null
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
          awarded_offer_id?: string | null
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
            foreignKeyName: "quotations_awarded_offer_fk"
            columns: ["awarded_offer_id"]
            isOneToOne: false
            referencedRelation: "quotation_offers"
            referencedColumns: ["id"]
          },
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
      v_quotation_best_lines: {
        Row: {
          line_no: number | null
          line_total: number | null
          offer_id: string | null
          product_id: string | null
          qty: number | null
          quotation_id: string | null
          quotation_item_id: string | null
          seller_company_id: string | null
          unit_price: number | null
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
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "v_quotation_comparison"
            referencedColumns: ["quotation_id"]
          },
          {
            foreignKeyName: "quotation_offer_lines_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "quotation_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_offers_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      v_quotation_comparison: {
        Row: {
          best_mixed_total: number | null
          best_single_supplier_total: number | null
          offers_count: number | null
          quotation_id: string | null
        }
        Insert: {
          best_mixed_total?: never
          best_single_supplier_total?: never
          offers_count?: never
          quotation_id?: string | null
        }
        Update: {
          best_mixed_total?: never
          best_single_supplier_total?: never
          offers_count?: never
          quotation_id?: string | null
        }
        Relationships: []
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
      admin_dashboard_stats: { Args: never; Returns: Json }
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
      admin_reject_seller: {
        Args: { p_note?: string; p_profile_id: string }
        Returns: undefined
      }
      admin_set_account_status: {
        Args: {
          p_profile_id: string
          p_status: Database["public"]["Enums"]["account_status"]
        }
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
      award_quotation: { Args: { p_offer_id: string }; Returns: string }
      cancel_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: {
          address_id: string | null
          address_snapshot: Json
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
      checkout: {
        Args: {
          p_address_id: string
          p_company_id?: string
          p_discount_code?: string
          p_notes?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_site_id?: string
          p_use_wallet?: boolean
        }
        Returns: string
      }
      clear_draft_quotation: { Args: never; Returns: Json }
      confirm_payment: { Args: { p_payment_id: string }; Returns: undefined }
      convert_level_for_branches: {
        Args: {
          p_level_category_id: string | null
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
      issue_draft_quotation: { Args: { p_valid_until?: string }; Returns: Json }
      issue_quotation: {
        Args: {
          p_quotation_id: string
          p_seller_company_ids: string[]
          p_valid_until?: string
        }
        Returns: {
          awarded_offer_id: string | null
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
        SetofOptions: {
          from: "*"
          to: "quotations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      list_favorite_products: { Args: never; Returns: Json }
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
      set_draft_quotation_item_supplier: {
        Args: { p_item_id: string; p_seller_company_id?: string }
        Returns: Json
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
