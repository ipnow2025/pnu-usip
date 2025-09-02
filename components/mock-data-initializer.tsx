"use client"

import { useEffect } from "react"
import { initializeMockData } from "@/lib/mock-data-initializer"

export function MockDataInitializer() {
  useEffect(() => {
    // 데이터베이스 초기화 (비동기)
    initializeMockData().catch(error => {
      console.error('데이터베이스 초기화 오류:', error)
    })
  }, [])

  return null
} 