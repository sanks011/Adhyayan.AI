const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_API_URL || "https://adhyayan-ai.onrender.com/api"
    : "http://localhost:5000/api"

class ApiService {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("authToken")
    }
    return null
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    const token = this.getToken()
    if (token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    return headers
  }

  async post(endpoint: string, data: any) {
    try {
      console.log(`Making POST request to: ${API_BASE_URL}${endpoint}`)
      console.log("Request data:", data)

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      })

      console.log("Response status:", response.status)

      const responseText = await response.text()
      console.log("Raw response:", responseText.substring(0, 200) + "...")

      if (!response.ok) {
        let error
        try {
          error = JSON.parse(responseText)
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError)
          throw new Error(`API request failed with status ${response.status}: ${responseText}`)
        }
        throw new Error(error.error || "API request failed")
      }

      try {
        return JSON.parse(responseText)
      } catch (parseError) {
        console.error("Failed to parse success response:", parseError)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }
    } catch (error) {
      console.error("API POST Error:", error)
      throw error
    }
  }

  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "API request failed")
    }

    return response.json()
  }

  // Authentication methods
  async authenticateWithGoogle(idToken: string, user: any) {
    const response = await this.post("/auth/google", { idToken, user })

    if (response.token) {
      localStorage.setItem("authToken", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
    }

    return response
  }

  async getUserProfile() {
    return this.get("/user/profile")
  }

  async logout() {
    const response = await this.post("/auth/logout", {})
    localStorage.removeItem("authToken")
    localStorage.removeItem("user")
    return response
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null
  }

  // Get stored user data
  getStoredUser() {
    if (typeof window !== "undefined") {
      const userData = localStorage.getItem("user")
      return userData ? JSON.parse(userData) : null
    }
    return null
  }

  // Mind Map API methods
  async generateMindMap(subjectName: string, syllabus: string) {
    return this.post("/mindmap/generate", { subjectName, syllabus })
  }

  async getMindMaps() {
    return this.get("/mindmap/list")
  }

  async getMindMap(id: string) {
    return this.get(`/mindmap/${id}`)
  }

  // Chat API method for Groq integration
  async chatWithGroq(message: string, context?: string, subject?: string) {
    return this.post("/chat/groq", { message, context, subject })
  }

  // Test API connection
  async testConnection() {
    return this.get("/test")
  }
}

export const apiService = new ApiService()
