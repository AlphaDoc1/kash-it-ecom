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
      addresses: {
        Row: {
          city: string
          created_at: string | null
          full_address: string
          id: string
          is_default: boolean | null
          label: string
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string | null
          full_address: string
          id?: string
          is_default?: boolean | null
          label: string
          phone: string
          pincode: string
          state: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string | null
          full_address?: string
          id?: string
          is_default?: boolean | null
          label?: string
          phone?: string
          pincode?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount: number | null
          min_order_amount: number | null
          usage_count: number | null
          usage_limit: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          min_order_amount?: number | null
          usage_count?: number | null
          usage_limit?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      delivery_partners: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          user_id: string
          vehicle_number: string | null
          vehicle_type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          user_id: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          user_id?: string
          vehicle_number?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_partners_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      iot_devices: {
        Row: {
          created_at: string | null
          device_name: string
          device_type: string | null
          id: string
          is_active: boolean | null
          location: string | null
        }
        Insert: {
          created_at?: string | null
          device_name: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
        }
        Update: {
          created_at?: string | null
          device_name?: string
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          snapshot_name: string
          snapshot_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          quantity: number
          snapshot_name: string
          snapshot_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          snapshot_name?: string
          snapshot_price?: number
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
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          coupon_code: string | null
          created_at: string | null
          delivery_partner_id: string | null
          delivery_status: string | null
          discount_amount: number | null
          final_amount: number
          id: string
          payment_id: string | null
          payment_status: string | null
          subtotal: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string | null
          delivery_partner_id?: string | null
          delivery_status?: string | null
          discount_amount?: number | null
          final_amount: number
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          subtotal: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_id?: string | null
          coupon_code?: string | null
          created_at?: string | null
          delivery_partner_id?: string | null
          delivery_status?: string | null
          discount_amount?: number | null
          final_amount?: number
          id?: string
          payment_id?: string | null
          payment_status?: string | null
          subtotal?: number
          updated_at?: string | null
          user_id?: string
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
            foreignKeyName: "orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_approved: boolean | null
          name: string
          price: number
          stock: number
          unit: string | null
          updated_at: string | null
          vendor_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          name: string
          price: number
          stock?: number
          unit?: string | null
          updated_at?: string | null
          vendor_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_approved?: boolean | null
          name?: string
          price?: number
          stock?: number
          unit?: string | null
          updated_at?: string | null
          vendor_id?: string
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
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_verified: boolean | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      sensor_data: {
        Row: {
          data_type: string
          device_id: string
          id: string
          recorded_at: string | null
          value: number
        }
        Insert: {
          data_type: string
          device_id: string
          id?: string
          recorded_at?: string | null
          value: number
        }
        Update: {
          data_type?: string
          device_id?: string
          id?: string
          recorded_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "sensor_data_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "iot_devices"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      vendors: {
        Row: {
          business_address: string | null
          business_description: string | null
          business_name: string
          created_at: string | null
          gstin: string | null
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_address?: string | null
          business_description?: string | null
          business_name: string
          created_at?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_address?: string | null
          business_description?: string | null
          business_name?: string
          created_at?: string | null
          gstin?: string | null
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin" | "vendor" | "delivery"
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
      app_role: ["user", "admin", "vendor", "delivery"],
    },
  },
} as const
