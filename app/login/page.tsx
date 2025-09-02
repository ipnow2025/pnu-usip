"use client"
import { useState } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { apiFetch, saveSession, getBasePath } from "@/lib/func"

export default function LoginPage() {
  const [memberId, setMemberId] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const res = await apiFetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "로그인 실패")
        return
      }

      if (data.ok && data.result) {
        saveSession(data.result)

        // 세션 저장 확인
        const savedSession = localStorage.getItem("member")

        // 약간의 지연 후 리다이렉트
        setTimeout(() => {
          const basePath = getBasePath()
          router.push(`${basePath}/patents`)
        }, 100)
      } else {
        setError("로그인 응답이 올바르지 않습니다")
      }
    } catch (e) {
      console.error("로그인 에러:", e) // 디버깅용
      setError("서버 연결 오류")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl w-full max-w-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-center mb-4">
          <strong className="text-2xl font-bold">PNU US IP</strong>
        </div>
        <input
          type="text"
          placeholder="회원 ID"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          required
          disabled={isLoading}
        />
        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 dark:bg-gray-700 dark:text-white"
          required
          disabled={isLoading}
        />
        {error && <div className="text-red-500 mb-4 text-center text-sm">{error}</div>}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed"
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </div>
  )
}
