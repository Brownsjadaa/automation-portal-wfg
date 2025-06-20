import { supabase } from "./supabase"
import type { Database } from "./supabase"

type AutomationLink = Database["public"]["Tables"]["automation_links"]["Row"]
type Category = Database["public"]["Tables"]["categories"]["Row"]
type User = Database["public"]["Tables"]["users"]["Row"]
type ClickAnalytic = Database["public"]["Tables"]["click_analytics"]["Row"]

// Generate unique channel names to avoid conflicts
const generateChannelName = (base: string) => `${base}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

// Automation Links CRUD
export const automationLinksService = {
  async getAll() {
    const res = await fetch("/api/links");
    if (!res.ok) throw new Error("Failed to fetch links");
    return res.json();
  },

  async getById(id: string) {
    const res = await fetch(`/api/links?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch link");
    return res.json();
  },

  async create(link: Database["public"]["Tables"]["automation_links"]["Insert"]) {
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(link),
    });
    if (!res.ok) throw new Error("Failed to create link");
    return res.json();
  },

  async update(id: string, updates: Database["public"]["Tables"]["automation_links"]["Update"]) {
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update link");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch("/api/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to delete link");
    }
  },

  async incrementClick(id: string, sessionId?: string) {
    // First, get current click count
    const { data: currentLink, error: fetchError } = await supabase
      .from("automation_links")
      .select("clicks, unique_visitors")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    // Check if this session has clicked before
    let isUniqueVisitor = false
    if (sessionId) {
      const { data: existingClick } = await supabase
        .from("click_analytics")
        .select("id")
        .eq("link_id", id)
        .eq("session_id", sessionId)
        .limit(1)

      isUniqueVisitor = !existingClick || existingClick.length === 0
    }

    // Update link statistics
    const { data, error } = await supabase
      .from("automation_links")
      .update({
        clicks: currentLink.clicks + 1,
        unique_visitors: isUniqueVisitor ? currentLink.unique_visitors + 1 : currentLink.unique_visitors,
        last_clicked: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Record click analytics
    await supabase.from("click_analytics").insert({
      link_id: id,
      clicked_at: new Date().toISOString(),
      session_id: sessionId,
      user_agent: typeof window !== "undefined" ? navigator.userAgent : null,
    })

    return data
  },

  // Subscribe to real-time changes
  subscribe(callback: (payload: any) => void) {
    const channelName = generateChannelName("automation_links")

    try {
      const channel = supabase.channel(channelName)

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "automation_links",
          },
          (payload) => {
            console.log("Automation links change:", payload)
            try {
              callback(payload)
            } catch (error) {
              console.error("Error in automation links callback:", error)
            }
          },
        )
        .subscribe((status, err) => {
          console.log(`Automation links subscription (${channelName}) status:`, status)
          if (err) {
            console.error(`Automation links subscription error:`, err)
          }
        })

      return {
        unsubscribe: () => {
          try {
            channel.unsubscribe()
            console.log(`Unsubscribed from automation links channel: ${channelName}`)
          } catch (error) {
            console.error("Error unsubscribing from automation links:", error)
          }
        },
      }
    } catch (error) {
      console.error("Error setting up automation links subscription:", error)
      return {
        unsubscribe: () => {},
      }
    }
  },
}

// Categories CRUD
export const categoriesService = {
  async getAll() {
    const res = await fetch("/api/categories");
    if (!res.ok) throw new Error("Failed to fetch categories");
    return res.json();
  },

  async create(category: Database["public"]["Tables"]["categories"]["Insert"]) {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    });
    if (!res.ok) throw new Error("Failed to create category");
    return res.json();
  },

  async update(id: string, updates: Database["public"]["Tables"]["categories"]["Update"]) {
    const res = await fetch("/api/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update category");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch("/api/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to delete category");
    }
  },

  subscribe(callback: (payload: any) => void) {
    const channelName = generateChannelName("categories")

    try {
      const channel = supabase.channel(channelName)

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "categories",
          },
          (payload) => {
            console.log("Categories change:", payload)
            try {
              callback(payload)
            } catch (error) {
              console.error("Error in categories callback:", error)
            }
          },
        )
        .subscribe((status, err) => {
          console.log(`Categories subscription (${channelName}) status:`, status)
          if (err) {
            console.error(`Categories subscription error:`, err)
          }
        })

      return {
        unsubscribe: () => {
          try {
            channel.unsubscribe()
            console.log(`Unsubscribed from categories channel: ${channelName}`)
          } catch (error) {
            console.error("Error unsubscribing from categories:", error)
          }
        },
      }
    } catch (error) {
      console.error("Error setting up categories subscription:", error)
      return {
        unsubscribe: () => {},
      }
    }
  },
}

// Users CRUD
export const usersService = {
  async getAll() {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
  },

  async create(user: Database["public"]["Tables"]["users"]["Insert"]) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error("Failed to create user");
    return res.json();
  },

  async update(id: string, updates: Database["public"]["Tables"]["users"]["Update"]) {
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update user");
    return res.json();
  },

  async delete(id: string) {
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to delete user");
    }
  },

  async updateLastActive(id: string) {
    const { data, error } = await supabase
      .from("users")
      .update({
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  subscribe(callback: (payload: any) => void) {
    const channelName = generateChannelName("users")

    try {
      const channel = supabase.channel(channelName)

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "users",
          },
          (payload) => {
            console.log("Users change:", payload)
            try {
              callback(payload)
            } catch (error) {
              console.error("Error in users callback:", error)
            }
          },
        )
        .subscribe((status, err) => {
          console.log(`Users subscription (${channelName}) status:`, status)
          if (err) {
            console.error(`Users subscription error:`, err)
          }
        })

      return {
        unsubscribe: () => {
          try {
            channel.unsubscribe()
            console.log(`Unsubscribed from users channel: ${channelName}`)
          } catch (error) {
            console.error("Error unsubscribing from users:", error)
          }
        },
      }
    } catch (error) {
      console.error("Error setting up users subscription:", error)
      return {
        unsubscribe: () => {},
      }
    }
  },
}

// Analytics
export const analyticsService = {
  async getClickAnalytics(linkId?: string, startDate?: string, endDate?: string) {
    let query = supabase
      .from("click_analytics")
      .select(`
        *,
        automation_links (
          title,
          category
        )
      `)
      .order("clicked_at", { ascending: false })

    if (linkId) {
      query = query.eq("link_id", linkId)
    }

    if (startDate) {
      query = query.gte("clicked_at", startDate)
    }

    if (endDate) {
      query = query.lte("clicked_at", endDate)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDashboardStats() {
    // Get total clicks
    const { count: totalClicks } = await supabase.from("click_analytics").select("*", { count: "exact", head: true })

    // Get unique visitors (unique session_ids)
    const { data: uniqueVisitorsData } = await supabase.from("click_analytics").select("session_id")

    const uniqueVisitors = new Set(uniqueVisitorsData?.filter((item) => item.session_id).map((item) => item.session_id))
      .size

    // Get total links
    const { count: totalLinks } = await supabase.from("automation_links").select("*", { count: "exact", head: true })

    // Get active users (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: activeUsers } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("last_active", yesterday)

    return {
      totalClicks: totalClicks || 0,
      uniqueVisitors,
      totalLinks: totalLinks || 0,
      activeUsers: activeUsers || 0,
      averageClickRate: totalLinks ? Math.round((totalClicks || 0) / totalLinks) : 0,
    }
  },

  subscribe(callback: (payload: any) => void) {
    const channelName = generateChannelName("analytics")

    try {
      const channel = supabase.channel(channelName)

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "click_analytics",
          },
          (payload) => {
            console.log("Analytics change:", payload)
            try {
              callback(payload)
            } catch (error) {
              console.error("Error in analytics callback:", error)
            }
          },
        )
        .subscribe((status, err) => {
          console.log(`Analytics subscription (${channelName}) status:`, status)
          if (err) {
            console.error(`Analytics subscription error:`, err)
          }
        })

      return {
        unsubscribe: () => {
          try {
            channel.unsubscribe()
            console.log(`Unsubscribed from analytics channel: ${channelName}`)
          } catch (error) {
            console.error("Error unsubscribing from analytics:", error)
          }
        },
      }
    } catch (error) {
      console.error("Error setting up analytics subscription:", error)
      return {
        unsubscribe: () => {},
      }
    }
  },
}

// Session management
export const sessionService = {
  getSessionId(): string {
    if (typeof window === "undefined") return ""

    let sessionId = sessionStorage.getItem("workforce_session_id")
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem("workforce_session_id", sessionId)
    }
    return sessionId
  },

  getUserId(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("workforce_user_id")
  },

  setUserId(userId: string) {
    if (typeof window === "undefined") return
    localStorage.setItem("workforce_user_id", userId)
  },
}
