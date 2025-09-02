"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { isLoggedIn, getBasePath } from "@/lib/func"

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 약간의 지연을 두어 localStorage가 준비될 시간을 줍니다
    const timer = setTimeout(() => {
      if (!isLoggedIn()) {
        const basePath = getBasePath()
        router.replace(`${basePath}/login`)
      } else {
        const basePath = getBasePath()
        router.replace(`${basePath}/patents`)
      }
      setIsLoading(false)
    }, 100)

    return () => clearTimeout(timer)
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">로딩중...</p>
        </div>
      </div>
    )
  }

  return null
}
